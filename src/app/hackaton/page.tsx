import Link from "next/link";
import { Card } from "@/components/Card";

export const metadata = { title: "Agora at the Meta hackathon" };

const RUBRIC: [string, string][] = [
  ["Impact", "Anyone can start a community app by pasting one link into Muse and answering plain questions. Trading kids' gear is one example; a learning group, a running club or a neighbourhood help board use the same platform."],
  ["Use of Meta AI tooling", "Platform-hosted agents call Meta models only: Muse Spark (muse-spark-1.3) for the interview, translation and photo naming, and SAM 3.1 for item boxes. Every call goes through one Meta client with routing, a cost meter and budgets."],
  ["Technical depth and execution", "A gatekeeper with red-team evals, a deal state machine, a faithful relay, encrypted fields, a read-only MCP connector, and a simulation with a held-out benchmark that measures the learning curve."],
  ["Demo", "A real Muse creates an app live from a pasted prompt, then two phones run a deal between two members who speak different languages."],
];

const LINKS: [string, string, string][] = [
  ["/", "Home", "The copy-paste prompt for Muse or Meta AI."],
  ["/start", "Create an app", "The interview, as a form or through an assistant."],
  ["/dashboard", "Judge dashboard", "Learning curves, a synthetic-city map and live safety checks."],
  ["/docs", "Docs", "Every feature, with its status, and a Q&A over the project documents."],
  ["/styleguide", "Styleguide", "Agora's design tokens and components."],
];

export default function HackatonPage() {
  return (
    <div className="stack-lg">
      <section className="page-head">
        <h1>Agora at the Meta hackathon</h1>
        <p className="lead">Built for the Meta Global AI Developer Hackathon (Cerebral Valley), track &ldquo;Build for Your World&rdquo;. Build window Oct 27 to Nov 4, 2026; submission Wed Nov 4, 9:00 PM ET; judging Nov 5 to 8.</p>
      </section>
      <Card title="The idea in one line">
        <p>Agora is a playground platform for community apps. A non-technical person pastes one link into Muse, answers plain questions about what their community does together, and gets an app where every member has an AI agent that acts for them in their own language. The member decides everything that matters.</p>
      </Card>
      <Card title="How it fits the judging rubric">
        <ul className="small">
          {RUBRIC.map(([k, v]) => (
            <li key={k}><strong>{k}.</strong> {v}</li>
          ))}
        </ul>
      </Card>
      <Card title="Rules we follow">
        <ul className="small">
          <li>Muse only: all agents are platform-hosted and call Meta models only.</li>
          <li>Everything is new work, started in the build window.</li>
          <li>Not a chatbot, a generic RAG tool or a classifieds site; no health, medical, legal or developmental advice; no politics.</li>
          <li>The platform never holds or moves money. Agents always ask their owner before a commitment, price, identity or location reveal.</li>
        </ul>
      </Card>
      <Card title="Honest limits">
        <ul className="small">
          <li>The create-an-app flow has not yet been tried with a real Muse; Meta documents custom connectors, and MCP in the consumer app is unconfirmed.</li>
          <li>No real carrier is connected; shipping labels come from a simulated carrier and say so.</li>
          <li>The simulation and judge dashboard use a sandbox city of synthetic families, and are labelled as simulated.</li>
          <li>Created apps cannot yet run events, calendars, RSVPs, group chat or announcements. <Link href="/docs">The docs</Link> list what exists.</li>
        </ul>
      </Card>
      <Card title="Where to look">
        <ul className="small">
          {LINKS.map(([href, label, text]) => (
            <li key={href}><Link href={href}>{label}</Link> <span className="muted">— {text}</span></li>
          ))}
          <li><span className="muted">In the repo: docs/PLAN.md (hackathon fit, scope tiers), docs/DEMO-SCRIPT.md (the 3-minute demo), docs/DEMO-TWO-PHONES.md.</span></li>
        </ul>
      </Card>
    </div>
  );
}
