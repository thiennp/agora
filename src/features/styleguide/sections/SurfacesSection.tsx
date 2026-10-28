import { Button, Callout, Card, CodeBlock, Hero, PageHeader } from "@/components/ui";

import { Demo, Section } from "../Block";

export function SurfacesSection() {
  return (
    <Section id="surfaces" title="Surfaces">
      <Demo title="Page header">
        <PageHeader eyebrow="Community" title="Garden tools" lead="Neighbours lend and swap what they own." actions={<Button>Invite someone</Button>} />
      </Demo>
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Card" description="Rounded, thin border, soft shadow.">
          <p className="text-small text-muted">Cards hold one idea each. Put actions in the header on the right.</p>
        </Card>
        <Callout title="Callout">Use it to point at one thing that needs attention, without the weight of an alert.</Callout>
      </div>
      <Hero tone="brand" title="Hero panel" actions={<Button variant="secondary">Primary action</Button>}>
        Large intro blocks use the brand gradient. Keep the copy to a sentence or two.
      </Hero>
      <Hero title="Plain hero">The same shape on a neutral surface.</Hero>
      <Demo title="Code block" note="Copies to the clipboard when allowed.">
        <CodeBlock>{"npm install\nnpm run dev"}</CodeBlock>
      </Demo>
    </Section>
  );
}
