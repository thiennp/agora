import { AgoraMark, Logo, MARK_PATH } from "@/components/ui";

import { Demo, Section } from "../Block";

const SIZES = [16, 22, 32, 48, 96] as const;

export function LogoSection() {
  return (
    <Section id="logo" title="Logo">
      <Demo title="The mark" note="An open square, the public square with a way in, around one person. The frame is the brand colour; the person is the text colour, so it follows light and dark mode by itself.">
        <div className="flex flex-wrap items-end gap-6">
          {SIZES.map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <AgoraMark size={s} />
              <span className="text-caption text-muted">{s}px</span>
            </div>
          ))}
        </div>
      </Demo>
      <Demo title="With the wordmark" note="The header uses this lockup as the link home. The wordmark is the sans in bold with tight tracking; nothing in it is coloured.">
        <div className="flex flex-wrap items-center gap-8">
          <Logo size={22} className="text-[1.1rem]" />
          <Logo size={32} className="text-[1.6rem]" />
          <div className="rounded-card bg-brand-950 px-6 py-4 text-brand-50 [--accent:var(--color-brand-300)]">
            <Logo size={22} className="text-[1.1rem]" />
          </div>
        </div>
      </Demo>
      <Demo title="On a tile" note="For home-screen icons and anywhere the mark sits on the brand colour: both parts white. The favicon and the Apple icon are generated from the same path at build time.">
        <div className="flex flex-wrap items-center gap-6">
          {[64, 40].map((s) => (
            <svg key={s} width={s} height={s} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
              <rect width="32" height="32" rx="7" fill="#6a3bc4" />
              <path d={MARK_PATH} transform="translate(16 16) scale(0.78) translate(-16 -16)" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" fill="none" />
              <circle cx="16" cy="16" r="2.6" fill="#fff" />
            </svg>
          ))}
        </div>
      </Demo>
      <Demo title="Rules">
        <ul className="m-0 list-disc space-y-1 pl-5 text-small text-muted">
          <li>Keep the opening at the bottom and the person in the centre; do not rotate, outline or add a gradient.</li>
          <li>Clear space around the mark of at least half its width. Smallest size 16px.</li>
          <li>Colours come from the tokens: accent for the frame, ink for the person, or both white on the brand tile.</li>
        </ul>
      </Demo>
    </Section>
  );
}
