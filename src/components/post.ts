"use client";

export type PostResult<T = unknown> = { ok: true; data: T } | { ok: false; message: string; code: string };

/** POST JSON and read the stable error shape ({ error: { code, message } }) the API uses. */
export async function postJson<T = unknown>(url: string, body: unknown): Promise<PostResult<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, code: data?.error?.code ?? "error", message: data?.error?.message ?? "Something went wrong." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, code: "network", message: "Could not reach the server. Check your connection and try again." };
  }
}
