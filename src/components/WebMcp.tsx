"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * WebMCP (https://webmachinelearning.github.io/webmcp): a page tells an assistant in the browser which tools it offers through
 * `navigator.modelContext`, so the assistant calls them instead of guessing at buttons. Every page registers the two reading tools below
 * (`WebMcpGlobal`, in the root layout); a page with an action adds its own with `useWebMcpTools`. A tool does exactly what its button does,
 * never more: nothing here decides, confirms or commits for a person. Browsers without WebMCP ignore all of this.
 */
export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string> | string;
}

interface ModelContext {
  registerTool(tool: { name: string; description: string; inputSchema: Record<string, unknown>; execute: (args: Record<string, unknown>) => Promise<unknown> }): unknown;
  unregisterTool?(name: string): unknown;
}

const modelContext = (): ModelContext | undefined => (typeof navigator === "undefined" ? undefined : (navigator as unknown as { modelContext?: ModelContext }).modelContext);

/** What a tool call returns to the assistant: one text block. */
const asContent = (text: string) => ({ content: [{ type: "text", text }] });

/** Registers tools while the calling component is on the page and removes them when it leaves. Always call it with the same tool names. */
export function useWebMcpTools(tools: WebMcpTool[]) {
  const latest = useRef(tools);
  latest.current = tools;
  const names = tools.map((t) => t.name).join(",");
  useEffect(() => {
    const ctx = modelContext();
    if (!ctx) return;
    const added: string[] = [];
    for (const t of latest.current) {
      try {
        ctx.registerTool({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          execute: async (args) => {
            const current = latest.current.find((x) => x.name === t.name) ?? t;
            try {
              return asContent(await current.execute(args ?? {}));
            } catch (e) {
              return { ...asContent(e instanceof Error ? e.message : "The tool failed."), isError: true };
            }
          },
        });
        added.push(t.name);
      } catch {
        // A tool with this name is already registered (a double mount): leave it.
      }
    }
    return () => {
      for (const n of added) {
        try {
          ctx.unregisterTool?.(n);
        } catch {
          // Already gone.
        }
      }
    };
  }, [names]);
}

const clip = (s: string | null | undefined, n = 120) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** The two tools every page has: look at the page, and go to another page of this site. */
export function WebMcpGlobal() {
  const router = useRouter();
  const path = usePathname();
  useWebMcpTools([
    {
      name: "describe_page",
      description: "Describe this Agora page: its title, headings, the buttons and the links to other pages of this site. Call it first on any page.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        const main = document.getElementById("main") ?? document.body;
        const headings = [...main.querySelectorAll("h1,h2,h3")].map((h) => clip(h.textContent)).filter(Boolean).slice(0, 30);
        const buttons = [...main.querySelectorAll("button")].map((b) => clip(b.textContent, 80)).filter(Boolean).slice(0, 30);
        const links = [...main.querySelectorAll("a[href^='/']")].map((a) => `${clip(a.textContent, 80)} -> ${a.getAttribute("href")}`).slice(0, 40);
        return JSON.stringify({ title: document.title, path, headings, buttons, links });
      },
    },
    {
      name: "go_to_page",
      description: "Open another page of this site. The path starts with a single slash, for example /app/my-app/items. It only opens a page; it changes nothing.",
      inputSchema: { type: "object", properties: { path: { type: "string", description: "Site path, starting with /" } }, required: ["path"] },
      execute: (args) => {
        const to = String(args.path ?? "");
        if (!to.startsWith("/") || to.startsWith("//")) throw new Error("Give a path on this site that starts with a single /.");
        router.push(to);
        return `Opening ${to}. Call describe_page once it has loaded.`;
      },
    },
  ]);
  return null;
}
