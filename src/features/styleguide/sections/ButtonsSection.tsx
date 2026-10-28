import { Button, type ButtonVariant } from "@/components/ui";

import { Demo, Section } from "../Block";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "outline", "ghost", "danger"];

export function ButtonsSection() {
  return (
    <Section id="buttons" title="Buttons">
      <Demo title="Variants">
        <div className="flex flex-wrap gap-3">
          {VARIANTS.map((v) => (
            <Button key={v} variant={v}>
              {v[0]!.toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </Demo>
      <Demo title="Sizes">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Demo>
      <Demo title="States">
        <div className="flex flex-wrap gap-3">
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
          <Button variant="outline" fullWidth>
            Full width
          </Button>
        </div>
      </Demo>
    </Section>
  );
}
