import { Banner } from "@/components/Card";
import { Interview } from "@/components/Interview";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";
import { agentBrief, answersFromQuery } from "@/lib/interview";

export const metadata = {
  title: "Make an app · Agora",
  alternates: { types: { "text/markdown": `${PUBLIC_BASE_URL}/start/agent.md` } },
};

/**
 * Where the home page QR code lands. A person gets the tap-answer interview. An AI assistant that only reads the page gets its task
 * in the HTML itself (the brief below, also at /start/agent.md) and finishes with a draft link, `?purpose=…&people=…`, which opens
 * the summary with the answers filled in. The person's tap on "Build it" is the only thing that creates an app (docs/PLAN.md §2c).
 */
export default async function Start({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { answers, problem } = answersFromQuery(await searchParams);
  return (
    <div className="stack-lg">
      <div>
        <h1>Make an app for your community</h1>
        <p className="muted">Muse asks a few questions, one at a time. You only tap your answers, or write your own. Nothing is built until you say yes.</p>
      </div>
      {problem ? <Banner tone="warn">{problem} Please answer the questions below instead.</Banner> : null}
      <noscript>
        <Banner tone="warn">This page needs JavaScript to show the questions. Turn it on, or ask your assistant (Muse) to interview you and give you a link.</Banner>
      </noscript>
      <Interview initial={answers} />
      <section aria-labelledby="assistant-title" className="stack">
        <h2 id="assistant-title" className="small">For an AI assistant (Muse) reading this page</h2>
        <p className="small muted">
          Your task is below, also as plain markdown at <a href={`${PUBLIC_BASE_URL}/start/agent.md`}>{PUBLIC_BASE_URL}/start/agent.md</a>.
        </p>
        <pre className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{agentBrief(PUBLIC_BASE_URL)}</pre>
      </section>
    </div>
  );
}
