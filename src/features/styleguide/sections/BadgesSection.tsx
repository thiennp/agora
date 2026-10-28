import { Badge, type BadgeTone } from "@/components/ui";

import { Demo, Section } from "../Block";

const TONES: BadgeTone[] = ["brand", "neutral", "success", "warning", "danger", "info"];

export function BadgesSection() {
  return (
    <Section id="badges" title="Badges">
      <Demo title="Soft">
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <Badge key={t} tone={t}>
              {t}
            </Badge>
          ))}
        </div>
      </Demo>
      <Demo title="Solid">
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <Badge key={t} tone={t} solid>
              {t}
            </Badge>
          ))}
        </div>
      </Demo>
      <Demo title="Small, with a marker">
        <div className="flex flex-wrap gap-2">
          <Badge size="sm" tone="success" before={<span aria-hidden="true">●</span>}>
            Active
          </Badge>
          <Badge size="sm" tone="warning" before={<span aria-hidden="true">●</span>}>
            Waiting
          </Badge>
        </div>
      </Demo>
    </Section>
  );
}
