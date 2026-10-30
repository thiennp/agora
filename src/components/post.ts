"use client";

export type PostResult<T = unknown> = { ok: true; data: T } | { ok: false; message: string; code: string };

/** Sub-path the app is served under (build-time AGORA_BASE_PATH, e.g. "/agora"); empty at the domain root. */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** PUT JSON, ignoring the answer: used for records the page must never wait on or fail because of. */
export async function putJsonQuietly(url: string, body: unknown): Promise<void> {
  try {
    await fetch(`${BASE_PATH}${url}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    // Recording progress is for the operator; the interview works without it.
  }
}

/** POST JSON and read the stable error shape ({ error: { code, message } }) the API uses. */
export async function postJson<T = unknown>(url: string, body: unknown): Promise<PostResult<T>> {
  try {
    const res = await fetch(`${BASE_PATH}${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, code: data?.error?.code ?? "error", message: data?.error?.message ?? "Something went wrong." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, code: "network", message: "Could not reach the server. Check your connection and try again." };
  }
}
