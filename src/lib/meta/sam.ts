/** One object SAM 3.1 found: its box in source pixels, the source size, and a confidence when asked for. */
export interface SamBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  confidence?: number;
}

/**
 * Read the boxes from SAM's answer text: per frame `<Nf>` then per object `id<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..;c=..|>` and a
 * mask token (not read here; masks are base85 rasters and boxes are enough for crops). Fields are read by key, not position.
 */
export function parseSamBoxes(text: string): SamBox[] {
  const out: SamBox[] = [];
  for (const m of text.matchAll(/<\|box;([^|]*)\|>/g)) {
    const f = Object.fromEntries(m[1]!.split(";").map((kv) => kv.split("=") as [string, string]));
    const n = (k: string) => Number(f[k]);
    const box = { x1: n("x1"), y1: n("y1"), x2: n("x2"), y2: n("y2"), width: n("w"), height: n("h") };
    if (Object.values(box).some((v) => !Number.isFinite(v))) continue;
    out.push(f.c !== undefined && Number.isFinite(n("c")) ? { ...box, confidence: n("c") } : box);
  }
  return out;
}

export interface SamClient {
  /** Boxes of everything matching one short noun phrase ("rain boots") in the image (a data URL). */
  find(image: string, concept: string): Promise<SamBox[]>;
}

/** SAM 3.1 on the Meta Model API: the same /responses endpoint, one concept and one image per request (checked live Oct 28, 2026). */
export function createSamClient(o: { baseUrl: string; apiKey: string; fetchImpl?: typeof fetch }): SamClient {
  const doFetch = o.fetchImpl ?? fetch;
  return {
    async find(image, concept) {
      const res = await doFetch(`${o.baseUrl.replace(/\/$/, "")}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${o.apiKey}` },
        body: JSON.stringify({
          model: "sam-3.1",
          store: false,
          metadata: { include_confidence: "true" },
          input: [{ type: "message", role: "user", content: [{ type: "input_text", text: concept }, { type: "input_image", image_url: image }] }],
        }),
      });
      // The status only: nothing from the request or the photo goes into an error.
      if (!res.ok) throw new Error(`sam error ${res.status}`);
      const body = (await res.json()) as { output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
      const text = (body.output ?? []).filter((i) => i.type === "message").flatMap((i) => i.content ?? []).map((c) => c.text ?? "").join("");
      return parseSamBoxes(text);
    },
  };
}
