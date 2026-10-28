import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Banner, Card } from "@/components/Card";
import { CopyLink } from "@/components/CopyLink";
import { JoinForm } from "@/components/JoinForm";
import { QrCode } from "@/components/QrCode";
import { appPageView, type AppPageView } from "@/app/_composition/app-views";
import { appUrl } from "@/app/_composition/public-url";

export const dynamic = "force-dynamic";

type Described = Exclude<AppPageView, { kind: "unknown" }>;

function About({ view }: { view: Described }) {
  const { app, description } = view;
  return (
    <>
      <Card title="What it is for">
        <p>{description.purpose}</p>
        <p className="muted">For {app.participant}s around {app.region}.</p>
      </Card>
      <Card title="What you can do">
        <ul className="list">{description.features.map((f) => <li key={f}>{f}</li>)}</ul>
      </Card>
      <Card title="The rules">
        <ul className="list">{description.rules.map((r) => <li key={r}>{r}</li>)}</ul>
      </Card>
    </>
  );
}

/**
 * `/app/{app}` (served at `/agora/app/{app}`), docs/PLAN.md §2c step 4, BR-42. One address for everyone, three views by session:
 * a stranger gets the join page, a member the member view, the creator the overview with the invite QR. The invite link is this
 * address, so it carries no secret. Each member's status page is `/muse/{id}` (step 5).
 */
export default async function AppPage({ params }: { params: Promise<{ app: string }> }) {
  const id = (await params).app;
  const view = await appPageView(id, (await cookies()).toString());
  if (view.kind === "unknown") notFound();
  const { app } = view;

  if (view.kind === "stranger") {
    return (
      <div className="stack-lg">
        <div>
          <p className="small muted">You are invited to</p>
          <h1>{app.name}</h1>
        </div>
        <About view={view} />
        <JoinForm appId={app.id} appName={app.name} noun={app.participant} />
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
        <Card title="Invite people" prominent>
          <p>Show this code or send the link. Anyone who opens it sees the app&apos;s purpose and rules and can join.</p>
          <div className="qr-home">
            <div className="qr-frame"><QrCode text={url} label={`QR code that opens ${url}`} /></div>
          </div>
          <p className="small qr-url"><a href={url}>{url}</a></p>
          <CopyLink url={url} title={`Join ${app.name}`} />
          <p className="small muted">The link holds no password. Anyone who has it can join, so share it only with the people you mean.</p>
        </Card>
        <p><Link className="btn" href={`/app/${app.id}/muse/${view.memberId}`}>See what your agent is doing</Link></p>
        <Card title={`Members (${view.members.length})`}>
          {view.members.length === 0 ? (
            <p className="muted">Nobody has joined yet. Share the invite to get started.</p>
          ) : (
            <ul className="list">
              {view.members.map((m) => (
                <li key={m.memberId}>{m.name || "No name given"} <span className="small muted">· {m.role === "creator" ? "creator" : "member"} · joined {m.joinedAt.slice(0, 10)}</span></li>
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
          <p className="small muted">You are a member of</p>
          <h1>{app.name}</h1>
        </div>
        <p><Link className="btn primary" href={`/app/${app.id}/muse/${view.memberId}`}>See what your agent is doing</Link></p>
        <About view={view} />
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div>
        <h1>{app.name}</h1>
      </div>
      <Banner tone="info">This is a demo app that runs on two built-in example people, so it has no members and no invite.</Banner>
      <About view={view} />
      <p><Link className="btn primary" href="/demo">Open the demo</Link></p>
    </div>
  );
}
