import { Banner, Card } from "@/components/Card";

export const metadata = { title: "Make an app · Agora" };

/** Where the home page QR code lands. The interview itself (docs/PLAN.md §2c, step 3) is not built yet. */
export default function Start() {
  return (
    <div className="stack-lg">
      <Card title="Make an app for your community">
        <p>Muse will ask you a few questions: what the app is called, what it is for, who joins and how things work. You only tap your answers.</p>
        <Banner tone="info">The interview is not built yet, so nothing can be created from this page today.</Banner>
      </Card>
    </div>
  );
}
