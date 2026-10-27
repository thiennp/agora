import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { Banner, Card } from "@/components/Card";

export default function Home() {
  return (
    <div className="stack-lg">
      <section className="hero">
        <h1>Agora</h1>
        <p className="lead">A platform for community apps. Every member has an agent that acts for them in their language, and the member decides everything that matters. The demo app is a kids&apos; gear exchange.</p>
      </section>
      <div className="grid grid-3">
        <Card title="Try it as an owner">
          <p className="muted">Two families: Mia (English) offers a winter jacket; Jonas (German) needs one. Their agents have already met. Pick who you are.</p>
          <div className="row">
            <Link className="btn primary" href="/cards?as=a">Be Mia</Link>
            <Link className="btn" href="/cards?as=b">Be Jonas</Link>
          </div>
        </Card>
        <Card title="See the evidence">
          <p className="muted">Does learning help? The simulation measures it on held-out scenarios, with the failures left in.</p>
          <Link className="btn" href="/dashboard">Open the dashboard</Link>
        </Card>
        <Card title="Start again">
          <p className="muted">Reset the scenario to the moment the agents first met.</p>
          <ActionButton url="/api/demo/reset" body={{}}>Restart the scenario</ActionButton>
        </Card>
      </div>
      <Card title="What is real in this demo, and what is not">
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
              <li>The carrier and drop points</li>
              <li>The families behind the dashboard&apos;s numbers</li>
              <li>Accounts: the two personas are not real sign-ins</li>
            </ul>
          </div>
        </div>
      </Card>
      <Banner tone="info">Owners never message each other directly. Everything goes through their own agent.</Banner>
    </div>
  );
}
