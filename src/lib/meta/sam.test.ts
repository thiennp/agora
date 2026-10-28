import { describe, expect, it } from "vitest";
import { createSamClient, parseSamBoxes } from "./sam";

const answer = "<0f>0<|box;x1=403;y1=21;x2=1058;y2=747;w=1920;h=1280;c=0.91|><|mask;x=0;y=0;c=0.91;data=727,656,~!!'GR#K{|>,1<|box;x1=10;y1=20;x2=30;y2=40;w=1920;h=1280|><|mask;x=0;y=0;data=4,4,~!!!!|>\n";

describe("parseSamBoxes", () => {
  it("reads every box by key, with or without a confidence, and ignores the masks", () => {
    expect(parseSamBoxes(answer)).toEqual([
      { x1: 403, y1: 21, x2: 1058, y2: 747, width: 1920, height: 1280, confidence: 0.91 },
      { x1: 10, y1: 20, x2: 30, y2: 40, width: 1920, height: 1280 },
    ]);
  });
  it("finds nothing in an empty or malformed answer", () => {
    expect(parseSamBoxes("")).toEqual([]);
    expect(parseSamBoxes("<|box;x1=a;y1=1;x2=2;y2=3;w=4;h=5|>")).toEqual([]);
  });
});

describe("createSamClient", () => {
  it("asks sam-3.1 for one concept on one image, without storing, and reads the boxes from the message", async () => {
    let call: { url: string; init: RequestInit } | undefined;
    const sam = createSamClient({
      baseUrl: "https://example.test/v1/",
      apiKey: "secret-key",
      fetchImpl: (async (url: string, init: RequestInit) => {
        call = { url, init };
        return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: answer }] }] }));
      }) as unknown as typeof fetch,
    });
    expect(await sam.find("data:image/jpeg;base64,AAAA", "winter jacket")).toHaveLength(2);
    expect(call!.url).toBe("https://example.test/v1/responses");
    const sent = JSON.parse(call!.init.body as string);
    expect(sent).toMatchObject({ model: "sam-3.1", store: false, metadata: { include_confidence: "true" } });
    expect(sent.input[0].content).toEqual([{ type: "input_text", text: "winter jacket" }, { type: "input_image", image_url: "data:image/jpeg;base64,AAAA" }]);
    expect((call!.init.headers as Record<string, string>).authorization).toBe("Bearer secret-key");
  });
  it("reports only the status when the request fails, never the key or the photo", async () => {
    const sam = createSamClient({ baseUrl: "https://example.test/v1", apiKey: "secret-key", fetchImpl: (async () => new Response("echo data:image/jpeg;base64,AAAA", { status: 400 })) as unknown as typeof fetch });
    const err = await sam.find("data:image/jpeg;base64,AAAA", "x").catch((e: Error) => e);
    expect((err as Error).message).toBe("sam error 400");
  });
});
