/** One retrievable passage of a markdown file, with enough position data to cite it exactly. */
export interface DocChunk {
  /** "<path>#<n>": stable while the file is unchanged. */
  id: string;
  /** Repo-relative path, always with forward slashes. */
  path: string;
  /** The file's first H1, or its path when it has none. */
  title: string;
  /** Headings above this passage, outermost first (for example ["Agents and model routing", "Routing"]). */
  headings: string[];
  text: string;
  /** 1-based, inclusive. */
  startLine: number;
  endLine: number;
}

export interface ChunkOptions {
  /** Longest passage in characters before it is split at a blank line. */
  maxChars?: number;
}

const DEFAULT_MAX_CHARS = 1400;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

interface Section {
  headings: string[];
  lines: { text: string; no: number }[];
}

/** Cut a markdown file into passages at its headings. Code fences are never split, so an example stays whole. */
export function chunkMarkdown(path: string, markdown: string, opts: ChunkOptions = {}): DocChunk[] {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const stack: { level: number; text: string }[] = [];
  const sections: Section[] = [];
  let current: Section = { headings: [], lines: [] };
  let fence: string | null = null;
  let title: string | null = null;

  const flush = () => {
    if (current.lines.some((l) => l.text.trim())) sections.push(current);
  };

  lines.forEach((text, i) => {
    const fenceMark = FENCE.exec(text)?.[1];
    if (fenceMark) fence = fence === null ? fenceMark : fence === fenceMark ? null : fence;
    const h = fence === null && !fenceMark ? HEADING.exec(text) : null;
    if (h) {
      flush();
      const level = h[1]!.length;
      while (stack.length && stack[stack.length - 1]!.level >= level) stack.pop();
      stack.push({ level, text: h[2]! });
      if (level === 1 && title === null) title = h[2]!;
      current = { headings: stack.map((s) => s.text), lines: [] };
      return;
    }
    current.lines.push({ text, no: i + 1 });
  });
  flush();

  const docTitle = title ?? path;
  const chunks: DocChunk[] = [];
  for (const section of sections) {
    for (const piece of splitSection(section.lines, maxChars)) {
      chunks.push({
        id: `${path}#${chunks.length}`,
        path,
        title: docTitle,
        headings: section.headings,
        text: piece.text,
        startLine: piece.start,
        endLine: piece.end,
      });
    }
  }
  return chunks;
}

/** Split a section's lines into pieces of at most `maxChars`, only at blank lines outside code fences. */
function splitSection(lines: Section["lines"], maxChars: number): { text: string; start: number; end: number }[] {
  const trimmed = trimBlank(lines);
  const whole = join(trimmed);
  if (!trimmed.length) return [];
  if (whole.length <= maxChars) return [{ text: whole, start: trimmed[0]!.no, end: trimmed[trimmed.length - 1]!.no }];

  const out: { text: string; start: number; end: number }[] = [];
  let piece: Section["lines"] = [];
  let fence = false;
  const emit = () => {
    const t = trimBlank(piece);
    if (t.length) out.push({ text: join(t), start: t[0]!.no, end: t[t.length - 1]!.no });
    piece = [];
  };
  for (const line of trimmed) {
    if (FENCE.test(line.text)) fence = !fence;
    const wouldOverflow = join([...piece, line]).length > maxChars;
    if (!fence && !line.text.trim() && piece.length && wouldOverflow) emit();
    else piece.push(line);
  }
  emit();
  return out;
}

const join = (ls: { text: string }[]) => ls.map((l) => l.text).join("\n").trim();

function trimBlank<T extends { text: string }>(ls: T[]): T[] {
  let a = 0;
  let b = ls.length;
  while (a < b && !ls[a]!.text.trim()) a++;
  while (b > a && !ls[b - 1]!.text.trim()) b--;
  return ls.slice(a, b);
}
