import { Section, Demo } from "../Block";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const SEMANTIC = [
  { name: "page", token: "--bg" },
  { name: "surface", token: "--surface" },
  { name: "surface-2", token: "--surface-2" },
  { name: "ink", token: "--text" },
  { name: "muted", token: "--muted" },
  { name: "line", token: "--border" },
  { name: "accent", token: "--accent" },
  { name: "accent-soft", token: "--accent-soft" },
  { name: "ok", token: "--ok" },
  { name: "warn", token: "--warn" },
  { name: "bad", token: "--bad" },
  { name: "info", token: "--info" },
] as const;

export function ColorsSection() {
  return (
    <Section id="colors" title="Colors">
      <Demo title="Brand scale" note="One purple family, defined in globals.css. Use 600 for filled controls and 50 to 100 for soft backgrounds.">
        <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0 sm:grid-cols-6 lg:grid-cols-11">
          {STEPS.map((step) => (
            <li key={step} className="text-center">
              <div className="h-12 rounded-control border border-line" style={{ background: `var(--color-brand-${step})` }} />
              <p className="mt-1 text-caption text-muted">{step}</p>
            </li>
          ))}
        </ul>
      </Demo>
      <Demo title="Semantic colors" note="What components use. Each one has a light and a dark value.">
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {SEMANTIC.map((c) => (
            <li key={c.name} className="flex items-center gap-3">
              <span className="h-9 w-9 shrink-0 rounded-control border border-line" style={{ background: `var(${c.token})` }} />
              <span className="min-w-0">
                <span className="block text-small font-semibold text-ink">{c.name}</span>
                <code className="block truncate text-caption text-muted">{c.token}</code>
              </span>
            </li>
          ))}
        </ul>
      </Demo>
      <Demo title="Type scale" note="System font stack; sizes come from the --text-* tokens.">
        <div className="space-y-2">
          <p className="text-display font-semibold text-ink">Display, 30 px</p>
          <p className="text-title font-semibold text-ink">Title, 22 px</p>
          <p className="text-heading font-semibold text-ink">Heading, 17 px</p>
          <p className="text-body text-ink">Body, 16 px</p>
          <p className="text-small text-muted">Small, 14 px</p>
          <p className="text-caption text-muted">Caption, 12 px</p>
        </div>
      </Demo>
    </Section>
  );
}
