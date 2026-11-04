import Link from "next/link";
import { DocsChat } from "@/components/DocsChat";
import { Card } from "@/components/Card";
import { getDocsKb } from "@/app/_composition/docs";
import { FEATURE_GROUPS, STATUS_LABEL } from "./features";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  const docs = getDocsKb().outline();
  return (
    <div className="stack-lg">
      <section className="page-head">
        <h1>Docs</h1>
        <p className="lead">Everything Agora provides, and a way to ask about it. Ask how Agora works, why it is built this way and how it scales. Answers come from the project&apos;s own documents, with the source shown. AI assistants can use the same knowledge base through MCP (see docs/DOCS-PLATFORM.md).</p>
      </section>
      <Card title="What Agora provides">
        <p className="small muted">Agora is a platform for community apps. Trading is one use case. Each feature shows whether it exists today. See also <Link href="/hackaton">the hackathon page</Link>.</p>
      </Card>
      {FEATURE_GROUPS.map((g) => (
        <Card key={g.title} title={g.title}>
          <ul className="small">
            {g.features.map((f) => (
              <li key={f.name}><strong>{f.name}</strong> <span className="muted">({STATUS_LABEL[f.status]})</span>. {f.text}</li>
            ))}
          </ul>
        </Card>
      ))}
      <Card title="Ask a question"><DocsChat /></Card>
      <Card title={`All ${docs.length} documents`}>
        <ul className="small">
          {docs.map((d) => (
            <li key={d.path}><Link href={`/docs/read?path=${encodeURIComponent(d.path)}`}>{d.path}</Link> <span className="muted">— {d.title}</span></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
