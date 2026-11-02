import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Where the app may send a webhook (docs/MUSE-CONNECTOR.md). The address comes from outside, so the app must never be turned into a way
 * to reach its own network: https on the default port only, no credentials in the address, no IP literal, no local or internal names,
 * and every address the name resolves to must be public. Checked when the webhook is registered and again before every send, because
 * a name can start pointing somewhere else later.
 */
export class WebhookUrlError extends Error {}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet", ".test", ".example", ".invalid"];

/** True for loopback, private, link-local, carrier-grade NAT, multicast, reserved and mapped addresses (IPv4 and IPv6). */
export function isPrivateAddress(ip: string): boolean {
  const v = ip.toLowerCase();
  if (isIP(v) === 6) {
    if (v === "::" || v === "::1") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    if (mapped) return isPrivateAddress(mapped[1]!);
    const first = parseInt(v.split(":")[0] || "0", 16);
    return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00 || v.startsWith("64:ff9b:") || v.startsWith("2001:db8");
  }
  const p = v.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}

/** The address as the app will store it, or throws `WebhookUrlError` saying what is wrong in plain words. No network access. */
export function parseWebhookUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new WebhookUrlError("That is not a web address.");
  }
  if (u.protocol !== "https:") throw new WebhookUrlError("A webhook address must start with https://.");
  if (u.username || u.password) throw new WebhookUrlError("A webhook address cannot hold a user name or password.");
  if (u.port && u.port !== "443") throw new WebhookUrlError("A webhook address must use the normal https port.");
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(host)) throw new WebhookUrlError("Use a name, not a numeric address.");
  if (!host.includes(".") || host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) throw new WebhookUrlError("That address is not on the public internet.");
  u.hash = "";
  return u;
}

export type Lookup = (host: string) => Promise<string[]>;
const systemLookup: Lookup = async (host) => (await dnsLookup(host, { all: true, verbatim: true })).map((a) => a.address);

/** `parseWebhookUrl` plus: the name resolves, and only to public addresses. */
export async function assertPublicWebhook(raw: string, lookup: Lookup = systemLookup): Promise<URL> {
  const u = parseWebhookUrl(raw);
  let addrs: string[];
  try {
    addrs = await lookup(u.hostname);
  } catch {
    throw new WebhookUrlError("That address could not be found.");
  }
  if (addrs.length === 0 || addrs.some(isPrivateAddress)) throw new WebhookUrlError("That address is not on the public internet.");
  return u;
}
