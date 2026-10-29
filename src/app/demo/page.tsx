import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { Banner, Card } from "@/components/Card";

export default function Home() {
  return (
    <div className="stack-lg">
      <section className="hero">
        <h1>Agora demo: a kids&apos; gear exchange</h1>
        <p className="lead">Agora is a platform for community apps. Every member has an agent that acts for them in their own language, and the member decides everything that matters. This demo shows one app on it: parents swapping outgrown kids&apos; gear.</p>
      </section>
      <div className="grid grid-3">
        <Card title="Try it as an owner">
          <p className="muted">Mia (English) offers a winter jacket and Jonas (German) needs one. Their agents have already met. Choose whose side to see.</p>
          <div className="row">
            <Link className="btn primary" href="/cards?as=a">Be Mia</Link>
            <Link className="btn" href="/cards?as=b">Be Jonas</Link>
          </div>
        </Card>
        <Card title="See the evidence">
          <p className="muted">Does the agent get better with feedback? The simulation measures it on held-out scenarios and reports failures as well as successes.</p>
          <div className="row">
            <Link className="btn" href="/dashboard">Open the dashboard</Link>
            <Link className="btn ghost" href="/styleguide">Design system</Link>
          </div>
        </Card>
        <Card title="Start again">
          <p className="muted">Return to the moment the two agents first met.</p>
          <ActionButton url="/api/demo/reset" body={{}}>Restart the scenario</ActionButton>
        </Card>
      </div>
      <Card title="What is real and what is simulated">
        <div className="grid grid-2">
          <div>
            <h3>Real</h3>
            <ul>
              <li>Matching, the agents&apos; negotiation and the round limit</li>
              <li>The agent pausing to ask its owner, and nothing final until both owners confirm</li>
              <li>The chat relay: contact details removed, addresses and payment requests blocked</li>
              <li>The handover plan, with the meeting place kept private until both agree</li>
              <li>What the agent learns from a decline, which you can delete</li>
            </ul>
          </div>
          <div>
            <h3>Simulated</h3>
            <ul>
              <li>Translation (there is no model key here, so it is marked <em>simulated</em>)</li>
              <li>Delivery and drop points</li>
              <li>The families behind the dashboard&apos;s numbers</li>
              <li>Accounts: the two personas are not real sign-ins</li>
            </ul>
          </div>
        </div>
      </Card>
      <Banner tone="info">Members never message each other directly. Everything goes through their own agent, which checks with them first.</Banner>
    </div>
  );
}
