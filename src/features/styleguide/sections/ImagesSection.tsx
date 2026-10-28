import { Placeholder } from "@/components/ui";

import { Demo, Section } from "../Block";

export function ImagesSection() {
  return (
    <Section id="images" title="Images">
      <Demo title="Picture slots" note="Drawn in CSS and SVG; the project ships no image files.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Placeholder label="Wide picture slot" ratio="video" />
          <Placeholder label="Square picture slot" ratio="square" />
          <Placeholder label="Banner picture slot" ratio="wide" />
        </div>
      </Demo>
    </Section>
  );
}
