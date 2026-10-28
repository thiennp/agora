/** The address a phone should open for this deployment, such as https://agentwitch.com/agora. */
export function publicBaseUrl(opts: {
  /** AGORA_PUBLIC_URL: wins when set, so a QR code never depends on request headers. */
  configured?: string;
  /** Request headers, used when nothing is configured (works for a LAN address in development). */
  host?: string | null;
  forwardedProto?: string | null;
  /** The sub-path the app is mounted under (AGORA_BASE_PATH), with no trailing slash. */
  basePath?: string;
}): string {
  if (opts.configured) return opts.configured.replace(/\/+$/, "");
  const host = (opts.host ?? "").split(",")[0]!.trim();
  // Only a plausible host:port is trusted; anything else falls back to localhost rather than echoing a header into a QR code.
  const safeHost = /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) ? host : "localhost:3000";
  const local = /^(localhost|127\.|\[::1\])/.test(safeHost);
  const proto = opts.forwardedProto === "http" || opts.forwardedProto === "https" ? opts.forwardedProto : local ? "http" : "https";
  return `${proto}://${safeHost}${opts.basePath ?? ""}`;
}
