import Link from "next/link";
import { DocsChat } from "@/components/DocsChat";
import { Card } from "@/components/Card";
import { getDocsKb } from "@/app/_composition/docs";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  const docs = getDocsKb().outline();
  return (
    <div className="stack-lg">
      <section className="page-head">
        <h1>Ask the docs</h1>
        <p className="lead">Ask how Agora works, why it is built this way and how it scales. Answers come from the project&apos;s own documents, with the source shown. AI assistants can use the same knowledge base through MCP (see docs/DOCS-PLATFORM.md).</p>
      </section>
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
