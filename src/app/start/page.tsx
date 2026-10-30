import { Banner } from "@/components/Card";
import { Interview } from "@/components/Interview";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";
import { agentBrief, answersFromQuery, INTERVIEW_PURPOSE, PROJECT_ID } from "@/lib/interview";

export const metadata = {
  title: "Create your app · Agora",
  alternates: { types: { "text/markdown": `${PUBLIC_BASE_URL}/start/agent.md` } },
};

/**
 * Where the home page QR code lands. A person gets the tap-answer interview. An AI assistant that only reads the page gets its task
 * in the HTML itself (the brief below, also at /start/agent.md) and finishes with a draft link, `?purpose=…&people=…`, which opens
 * the summary with the answers filled in. The person's tap on "Build it" is the only thing that creates an app (docs/PLAN.md §2c).
 */
export default async function Start({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const { answers, problem } = answersFromQuery(query);
  // An assistant that opened a project id for this person puts it in the link (BR-48); anything that is not an id is ignored.
  const project = Array.isArray(query.project) ? query.project[0] : query.project;
  return (
    <div className="stack-lg">
      <header className="page-head">
        <h1>Let&apos;s create your app</h1>
        <p className="lead">{INTERVIEW_PURPOSE} Tap an answer or write your own.</p>
      </header>
      {problem ? <Banner tone="warn">{problem} Please answer the questions below instead.</Banner> : null}
      <noscript>
        <Banner tone="warn">This page needs JavaScript to show the questions. Turn it on, or ask Muse to interview you in the chat and give you a link.</Banner>
      </noscript>
      <Interview initial={answers} projectId={project && PROJECT_ID.test(project) ? project : undefined} />
      <section aria-labelledby="assistant-title" className="stack">
        <h2 id="assistant-title" className="small">For AI assistants</h2>
        <p className="small muted">
          The person on this page wants to create an app. Your instructions are below, and also as plain markdown at <a href={`${PUBLIC_BASE_URL}/start/agent.md`}>{PUBLIC_BASE_URL}/start/agent.md</a>.
        </p>
        <pre className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{agentBrief(PUBLIC_BASE_URL)}</pre>
      </section>
    </div>
  );
}
