/** The public address of the demo. Hardcoded on purpose: the home page QR code must always open this, whatever host served the page. */
export const PUBLIC_BASE_URL = "https://agentwitch.com/agora";

export const startUrl = `${PUBLIC_BASE_URL}/start`;

/** The invite link of an app. It is only the app's address: it carries no secret, so sharing or screenshotting it gives away nothing but the join page. */
export const appUrl = (appId: string) => `${PUBLIC_BASE_URL}/app/${appId}`;
