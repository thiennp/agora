import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { getDocsKb } from "@/app/_composition/docs";

export const dynamic = "force-dynamic";

/** A document with one anchor per line, so a citation such as path:120-140 links straight to its lines. */
export default async function ReadDoc({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const path = (await searchParams).path ?? "";
  const doc = getDocsKb().get(path);
  if (!doc) notFound();
  return (
    <div className="stack-lg">
      <p><Link href="/docs">← Ask the docs</Link></p>
      <Card title={doc.title}>
        <p className="muted small">{doc.path}</p>
        <pre className="small" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {doc.markdown.split("\n").map((line, i) => (
            <span key={i} id={`L${i + 1}`} style={{ display: "block" }}>{line || " "}</span>
          ))}
        </pre>
      </Card>
    </div>
  );
}
