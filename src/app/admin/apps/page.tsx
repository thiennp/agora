import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Banner, Card } from "@/components/Card";
import { ADMIN_COOKIE, adminEnabled, adminTokenValid, listAdminApps, listAdminProjects } from "@/app/_composition/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "All apps · Agora admin", robots: { index: false, follow: false } };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Operator-only list of every app created on the platform. Hidden (404) unless ADMIN_TOKEN is set; shows counts, never member names, secrets or content. */
export default async function AdminApps({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!adminEnabled()) notFound();
  const signedIn = adminTokenValid((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!signedIn) {
    const error = (await searchParams).error;
    return (
      <div className="stack-lg">
        <header className="page-head"><h1>Admin</h1></header>
        {error ? <Banner tone="warn">{error === "limit" ? "Too many attempts. Try again later." : "That token is not right."}</Banner> : null}
        <Card title="Sign in">
          <form method="post" action={`${BASE}/api/admin/session`} className="stack">
            <label>Admin token<input type="password" name="token" autoComplete="off" required /></label>
            <button type="submit">Sign in</button>
          </form>
        </Card>
      </div>
    );
  }
  const [apps, projects] = await Promise.all([listAdminApps(), listAdminProjects()]);
  return (
    <div className="stack-lg">
      <header className="page-head">
        <h1>All apps</h1>
        <p className="lead">{apps.length} created on this platform. Counts only: no member names, secrets or messages.</p>
      </header>
      <Card as="div">
        {apps.length === 0 ? <p className="muted">No app has been created yet.</p> : (
          <table>
            <thead><tr><th>App</th><th>Region</th><th className="num">Members</th><th>First joined</th></tr></thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td><a href={`${BASE}/app/${a.id}`}>{a.name}</a><div className="small muted">{a.id} · {a.tagline}</div></td>
                  <td>{a.region}</td>
                  <td className="num">{a.members}</td>
                  <td>{a.firstJoinedAt ? a.firstJoinedAt.slice(0, 10) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <header className="page-head">
        <h2>Interviews</h2>
        <p className="lead">{projects.length} people started creating an app, newest activity first. A project id is opened when the questions open, and each answer shows up here as it is given.</p>
      </header>
      <Card as="div">
        {projects.length === 0 ? <p className="muted">Nobody has started yet.</p> : (
          <table>
            <thead><tr><th>Project</th><th>Status</th><th className="num">Answered</th><th>Last activity</th></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.projectId}>
                  <td>
                    <code className="small">{p.projectId}</code>
                    <div className="small muted">{p.source === "phone" ? "phone page" : "assistant"} · opened {p.createdAt.slice(0, 16).replace("T", " ")}</div>
                    {p.answers.length > 0 ? (
                      <details><summary className="small muted">Answers</summary>
                        <dl className="summary">{p.answers.map((a) => <div key={a.step}><dt className="small muted">{a.step}</dt><dd>{a.label}</dd></div>)}</dl>
                      </details>
                    ) : null}
                  </td>
                  <td>{p.status === "built" ? <>Built{p.appId ? <> · <a href={`${BASE}/app/${p.appId}`}>{p.appId}</a></> : null}</> : p.status === "in_progress" ? "In progress" : "Just opened"}</td>
                  <td className="num">{p.answered}/{p.of}</td>
                  <td>{p.updatedAt.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
