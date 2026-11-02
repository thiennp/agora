import { Banner } from "@/components/Card";
import { DraftBuild } from "@/components/DraftBuild";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";
import { answersFromQuery, INTERVIEW_PURPOSE, PROJECT_ID } from "@/lib/interview";

export const metadata = {
  title: "Create your app · Agora",
  alternates: { types: { "text/markdown": `${PUBLIC_BASE_URL}/start/agent.md` } },
};

/**
 * Where an assistant that can only open links sends the person (it cannot send the two web requests that build an app). The link
 * carries the answers; this page shows the checked summary and the person's own tap on "Build it" is the only thing that stores an app.
 */
export default async function Start({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const { answers, problem } = answersFromQuery(query);
  const project = Array.isArray(query.project) ? query.project[0] : query.project;
  return (
    <div className="stack-lg">
      <header className="page-head">
        <h1>Check your app</h1>
        <p className="lead">{INTERVIEW_PURPOSE}</p>
      </header>
      {problem ? <Banner tone="warn">{problem} Ask your assistant to make a new link.</Banner> : null}
      {answers.length ? (
        <DraftBuild answers={answers} projectId={project && PROJECT_ID.test(project) ? project : undefined} />
      ) : (
        <Banner tone="info">This page shows the app your assistant described. Ask your assistant (Muse or Meta AI) to create your app and give you the link.</Banner>
      )}
      <noscript>
        <Banner tone="warn">This page needs JavaScript to show your app and build it. Turn it on and reload.</Banner>
      </noscript>
    </div>
  );
}
