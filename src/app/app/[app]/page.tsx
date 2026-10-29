import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Banner, Card } from "@/components/Card";
import { CopyLink } from "@/components/CopyLink";
import { UseAppForm } from "@/components/UseAppForm";
import { QrCode } from "@/components/QrCode";
import { appPageView, type AppPageView } from "@/app/_composition/app-views";
import { PUBLIC_BASE_URL, appUrl } from "@/app/_composition/public-url";
import { appAgentBrief, appVocabulary, loadApp } from "@/lib/app-config";

export async function generateMetadata({ params }: { params: Promise<{ app: string }> }) {
  const id = (await params).app;
  return { alternates: { types: { "text/markdown": `${PUBLIC_BASE_URL}/app/${id}/agent.md` } } };
}

export const dynamic = "force-dynamic";

type Described = Exclude<AppPageView, { kind: "unknown" }>;

function About({ view }: { view: Described }) {
  const { app, description } = view;
  return (
    <>
      <Card title="What it is for">
        <p>{description.purpose}</p>
        <p className="muted">Made for {app.participant === "person" ? "people" : `${app.participant}s`}{app.region === "Anywhere" ? "" : `, set up for ${app.region}`}. Anyone with Muse can use it.</p>
      </Card>
      <Card title="What you can do">
        <ul className="list">{description.features.map((f) => <li key={f}>{f}</li>)}</ul>
      </Card>
      <Card title="What it does not do">
        <ul className="list">{description.limits.map((r) => <li key={r}>{r}</li>)}</ul>
      </Card>
      <Card title="The rules">
        <ul className="list">{description.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </Card>
    </>
  );
}

function ForAssistant({ view }: { view: Described }) {
  return (
    <section aria-labelledby="assistant-title" className="stack">
      <h2 id="assistant-title" className="small">For an AI assistant (Muse) reading this page</h2>
      <p className="small muted">
        This page, as plain markdown: <a href={`${PUBLIC_BASE_URL}/app/${view.app.id}/agent.md`}>{PUBLIC_BASE_URL}/app/{view.app.id}/agent.md</a>.
      </p>
      <pre className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{appAgentBrief(view.app, view.description, PUBLIC_BASE_URL)}</pre>
    </section>
  );
}

/**
 * `/app/{app}` (served at `/agora/app/{app}`), docs/PLAN.md §2c step 4 and §2c-ter, BR-42. One address, public by default: anyone, including
 * an assistant (Muse) that opens the link, sees the same public page (name, purpose, what it does, rules) in server HTML, also as markdown
 * at `/app/{app}/agent.md`. A person who opens it in a browser is set up on first use (no form). The creator, with their session, gets the
 * private overview with the share link. The share link is this address, so it carries no secret. A person's status page is `/muse/{id}`.
 */
export default async function AppPage({ params }: { params: Promise<{ app: string }> }) {
  const id = (await params).app;
  const view = await appPageView(id, (await cookies()).toString());
  if (view.kind === "unknown") notFound();
  const { app } = view;
  const w = appVocabulary(await loadApp(id));

  if (view.kind === "stranger") {
    return (
      <div className="stack-lg">
        <div>
          <p className="small muted">An app for anyone with Muse</p>
          <h1>{app.name}</h1>
        </div>
        <About view={view} />
        <UseAppForm appId={app.id} appName={app.name} />
        <ForAssistant view={view} />
      </div>
    );
  }

  if (view.kind === "creator") {
    const url = appUrl(app.id);
    return (
      <div className="stack-lg">
        <div>
          <p className="small muted">Your app</p>
          <h1>{app.name}</h1>
        </div>
        <Card title="Share your app" prominent>
          <p>Show this code or send the link. Anyone who opens it, and any Muse that reads it, sees what the app is for and its rules, and can use it.</p>
          <figure className="qr-card">
            <div className="qr-frame"><QrCode text={url} label={`QR code that opens ${url}`} /></div>
            <figcaption className="small qr-url"><a href={url}>{url}</a></figcaption>
          </figure>
          <CopyLink url={url} title={`Use ${app.name}`} />
          <p className="small muted">The link holds no password and opens a public page. Anyone who has it can use the app.</p>
        </Card>
        <p className="row">
          <Link className="btn primary" href={`/app/${app.id}/items`}>{w.style === "board" ? "Post what you offer or need" : "Add what you offer or need"}</Link>
          <Link className="btn" href={`/app/${app.id}/muse/${view.memberId}`}>See what your agent is doing for you</Link>
        </p>
        <Card title={`People using your app (${view.members.length})`}>
          {view.members.length === 0 ? (
            <p className="muted">Nobody is using it yet. Share the link to get started.</p>
          ) : (
            <ul className="list">
              {view.members.map((m) => (
                <li key={m.memberId}>{m.name || "No name given"} <span className="small muted">· {m.role === "creator" ? "you, the creator" : "user"} · since {m.joinedAt.slice(0, 10)}</span></li>
              ))}
            </ul>
          )}
        </Card>
        <About view={view} />
      </div>
    );
  }

  if (view.kind === "member") {
    return (
      <div className="stack-lg">
        <div>
          <p className="small muted">You are using</p>
          <h1>{app.name}</h1>
        </div>
        <p className="row">
          <Link className="btn primary" href={`/app/${app.id}/items`}>{w.style === "board" ? "Post what you offer or need" : "Add what you offer or need"}</Link>
          <Link className="btn" href={`/app/${app.id}/muse/${view.memberId}`}>See what your agent is doing for you</Link>
        </p>
        <About view={view} />
        <ForAssistant view={view} />
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div>
        <h1>{app.name}</h1>
      </div>
      <Banner tone="info">This is a demo app that runs on two built-in example people, so it has no users of its own and no share link.</Banner>
      <About view={view} />
      <p><Link className="btn primary" href="/demo">Open the demo</Link></p>
      <ForAssistant view={view} />
    </div>
  );
}
