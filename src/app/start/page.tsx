import { Interview } from "@/components/Interview";

export const metadata = { title: "Make an app · Agora" };

/** Where the home page QR code lands: the create-an-app interview (docs/PLAN.md §2c, step 3). */
export default function Start() {
  return (
    <div className="stack-lg">
      <div>
        <h1>Make an app for your community</h1>
        <p className="muted">Muse asks a few questions, one at a time. You only tap your answers, or write your own. Nothing is built until you say yes.</p>
      </div>
      <Interview />
    </div>
  );
}
