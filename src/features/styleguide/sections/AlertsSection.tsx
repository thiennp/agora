import { Alert } from "@/components/ui";

import { Demo, Section } from "../Block";

export function AlertsSection() {
  return (
    <Section id="alerts" title="Alerts">
      <Demo title="Tones" note="Each has an icon and a title, so meaning never depends on color alone.">
        <div className="space-y-3">
          <Alert tone="success" title="Offer accepted">Both owners confirmed the swap.</Alert>
          <Alert tone="info" title="Translated for you">Messages arrive in your language.</Alert>
          <Alert tone="warning" title="Needs your decision" action={<a href="#alerts">Review the question</a>}>Your agent will not agree to a price without asking.</Alert>
          <Alert tone="danger" title="Could not send">Check the connection and try again.</Alert>
        </div>
      </Demo>
    </Section>
  );
}
