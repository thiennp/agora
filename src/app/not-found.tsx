import Link from "next/link";

export default function NotFound() {
  return (
    <div className="status-page">
      <h1>Page not found</h1>
      <p>This address does not lead anywhere. The link may be mistyped or out of date.</p>
      <Link className="btn primary" href="/">Back to the home page</Link>
    </div>
  );
}
