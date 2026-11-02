import { CopyPrompt } from "@/components/CopyPrompt";
import { startBriefUrl } from "./_composition/public-url";

/**
 * What a person pastes into Muse or Meta AI. It names the goal, points at the brief, repeats the two rules an assistant most often
 * skips (one question at a time; the person builds, not the assistant) and says what to do if the assistant cannot open links.
 * The brief itself (`/start/agent.md`) stays the single source of the interview.
 */
const pastePrompt = `I want to create an app on Agora. Open ${startBriefUrl} and follow the instructions there exactly. Interview me here in this chat, one short question at a time, in plain language. When we are done, give me the link described there so I can review my answers and build the app myself. If you cannot open the link, tell me.`;

/**
 * The home page: one copy-and-paste message for Muse or Meta AI, which starts the interview in that chat. There is no QR code:
 * assistants do not know what to do with one.
 */
export default function Home() {
  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-copy">
          <h1 id="home-title">Copy, paste, create an app</h1>
          <p className="lead">Copy the message below and paste it into Muse or Meta AI. It will ask you a few questions and create the app with you.</p>
          <ol className="home-steps" aria-label="How it works">
            <li>Copy the message and paste it into your assistant&apos;s chat.</li>
            <li>Answer a few questions about your app.</li>
            <li>Say yes to the summary. Your app is ready, with an admin dashboard only you can open.</li>
          </ol>
        </div>
        <CopyPrompt text={pastePrompt} />
      </section>

    </div>
  );
}
