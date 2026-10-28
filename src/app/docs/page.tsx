import Link from "next/link";
import { DocsChat } from "@/components/DocsChat";
import { Card } from "@/components/Card";
import { getDocsKb } from "@/app/_composition/docs";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  const docs = getDocsKb().outline();
  return (
    <div className="stack-lg">
      <section className="hero">
        <h1>Ask the docs</h1>
        <p className="lead">Questions about how Agora works, why it was built that way, and how it scales, answered from the project&apos;s own documents with the source shown. The same knowledge base is available to AI assistants through MCP (see docs/DOCS-PLATFORM.md).</p>
      </section>
      <Card title="Chat"><DocsChat /></Card>
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
