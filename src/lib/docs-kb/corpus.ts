import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { chunkMarkdown, type DocChunk } from "./chunk";
import { buildIndex, type Index } from "./search";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".claude", "reports", "coverage", "dist"]);

export interface DocFile {
  /** Repo-relative, forward slashes. */
  path: string;
  markdown: string;
  mtimeMs: number;
}

export interface DocOutline {
  path: string;
  title: string;
  headings: string[];
  chunks: number;
}

/** Every markdown file under `root` (docs, ADRs, README, per-folder REQUIREMENTS), skipping build output and dependencies. */
export function loadDocFiles(root: string): DocFile[] {
  const files: DocFile[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const full = join(dir, entry.name);
        const markdown = readFileSync(full, "utf8");
        if (!markdown.trim()) continue; // empty placeholders hold nothing to retrieve
        files.push({ path: full.slice(root.length + 1).split(sep).join("/"), markdown, mtimeMs: statSync(full).mtimeMs });
      }
    }
  };
  walk(root);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * The searchable knowledge base over a repository's markdown. The index is rebuilt only when a file is added, removed or
 * edited, so a running server sees doc changes without a restart and an unchanged corpus costs one directory walk per call.
 */
export function createDocsKb(root: string = process.cwd()) {
  let signature = "";
  let files: DocFile[] = [];
  let index: Index = buildIndex([]);
  const byPath = new Map<string, DocFile>();

  function refresh() {
    const next = loadDocFiles(root);
    const sig = next.map((f) => `${f.path}:${f.mtimeMs}:${f.markdown.length}`).join("|");
    if (sig === signature) return;
    signature = sig;
    files = next;
    byPath.clear();
    for (const f of next) byPath.set(f.path, f);
    index = buildIndex(next.flatMap((f) => chunkMarkdown(f.path, f.markdown)));
  }

  return {
    index(): Index {
      refresh();
      return index;
    },
    outline(): DocOutline[] {
      refresh();
      const counts = new Map<string, number>();
      for (const c of index.chunks) counts.set(c.path, (counts.get(c.path) ?? 0) + 1);
      return files.map((f) => {
        const first = index.chunks.find((c) => c.path === f.path);
        const headings = [...new Set(index.chunks.filter((c) => c.path === f.path).map((c) => c.headings.join(" › ")).filter(Boolean))];
        return { path: f.path, title: first?.title ?? f.path, headings, chunks: counts.get(f.path) ?? 0 };
      });
    },
    /** One whole file, or only the passages under a heading. Only indexed paths resolve, so a request cannot reach other files. */
    get(path: string, section?: string): { path: string; title: string; markdown: string } | null {
      refresh();
      const file = byPath.get(path);
      if (!file) return null;
      const chunks = index.chunks.filter((c) => c.path === path);
      const title = chunks[0]?.title ?? path;
      if (!section) return { path, title, markdown: file.markdown };
      const needle = section.toLowerCase();
      const picked: DocChunk[] = chunks.filter((c) => c.headings.some((h) => h.toLowerCase().includes(needle)));
      return picked.length ? { path, title, markdown: picked.map((c) => c.text).join("\n\n") } : null;
    },
  };
}

export type DocsKb = ReturnType<typeof createDocsKb>;
