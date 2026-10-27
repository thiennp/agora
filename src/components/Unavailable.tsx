import { Banner } from "./Card";

export function Unavailable({ message }: { message: string }) {
  return (
    <div className="stack">
      <h1>Not available</h1>
      <Banner tone="warn">{message}</Banner>
    </div>
  );
}
