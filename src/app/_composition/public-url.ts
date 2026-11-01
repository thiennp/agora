/** The public address of the demo. Hardcoded on purpose: the home page QR code must always open this, whatever host served the page. */
export const PUBLIC_BASE_URL = "https://agentwitch.com/agora";

export const startUrl = `${PUBLIC_BASE_URL}/start`;

/** What the home page QR code and links open: the interview brief for the person's assistant. The assistant runs the interview in chat; the person's typed yes is the approval. */
export const startBriefUrl = `${startUrl}/agent.md`;

/** The invite link of an app. It is only the app's address: it carries no secret, so sharing or screenshotting it gives away nothing but the join page. */
export const appUrl = (appId: string) => `${PUBLIC_BASE_URL}/app/${appId}`;
