import { Banner } from "@/components/Card";
import { StartForm } from "@/components/StartForm";
import { PUBLIC_BASE_URL } from "@/app/_composition/public-url";
import { answersFromQuery, draftValues, INTERVIEW_PURPOSE, PROJECT_ID, STEP_ORDER, stepOf } from "@/lib/interview";

export const metadata = {
  title: "Create your app · Agora",
  alternates: { types: { "text/markdown": `${PUBLIC_BASE_URL}/start/agent.md` } },
};

/**
 * The create-an-app form. An assistant that cannot send web requests (Meta AI cannot, not even from a page it builds) writes a link that
 * fills this form in (`?purpose=…&actions=…`, or the older `?draft=a~b~c`); the person reads it here, changes what they like and taps.
 * A complete link opens straight on the checked summary. The person's own tap on "Build it" is the only thing that stores an app.
 */
export default async function Start({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const { answers, problem } = answersFromQuery(query);
  const { values, problem: readProblem } = draftValues(query);
  const project = Array.isArray(query.project) ? query.project[0] : query.project;
  const steps = STEP_ORDER.map((id) => {
    const s = stepOf(id);
    return { id, ask: s.ask, hint: s.hint, options: s.options, maxLength: s.maxLength };
  });
  const ready = !problem && answers.length === STEP_ORDER.length;
  return (
    <div className="stack-lg">
      <header className="page-head">
        <h1>Create your app</h1>
        <p className="lead">{INTERVIEW_PURPOSE}</p>
      </header>
      {problem || readProblem ? <Banner tone="warn">{readProblem ?? problem}</Banner> : null}
      <StartForm steps={steps} initial={values} projectId={project && PROJECT_ID.test(project) ? project : undefined} ready={ready} />
      <noscript>
        <Banner tone="warn">This page needs JavaScript to show your app and build it. Turn it on and reload.</Banner>
      </noscript>
    </div>
  );
}
