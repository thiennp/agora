/**
 * The HTML page an assistant shows when its sandbox cannot send web requests (Meta AI cannot): a complete, script-free document the
 * assistant copies as it is, changing only the marked values. The person's own browser then opens the link. Two ways to press, because
 * a sandbox preview may block one: a plain GET form (no `target`, so a preview that forbids pop-ups still navigates) and an ordinary
 * link. The address is also written as text, the last resort to copy by hand. It sends nothing itself: opening a page changes nothing,
 * and any tap that stores something happens on our page, by the person.
 */
export interface OpenPage {
  /** Where the form goes and the link points (no query). */
  action: string;
  /** One hidden input per field, in order; the same fields make the query of the link. */
  fields: Array<[name: string, value: string]>;
  /** What the person reads above the buttons, plain text. */
  intro: string;
  button: string;
}

export const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const BUTTON = "display:inline-block;font:600 18px system-ui,sans-serif;padding:14px 22px;border:0;border-radius:10px;background:#1a56db;color:#fff;text-decoration:none;cursor:pointer";

export function openPageHtml(p: OpenPage): string {
  const query = p.fields.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  const url = query ? `${p.action}?${query}` : p.action;
  const inputs = p.fields.map(([k, v]) => `    <input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`).join("\n");
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(p.button)}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:24px auto;padding:0 16px;line-height:1.5">
  <p>${escapeHtml(p.intro)}</p>
  <form method="GET" action="${escapeHtml(p.action)}">
${inputs}${inputs ? "\n" : ""}    <button type="submit" style="${BUTTON}">${escapeHtml(p.button)}</button>
  </form>
  <p>If the button does nothing, use this link: <a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="${BUTTON}">${escapeHtml(p.button)}</a></p>
  <p style="word-break:break-all;font-size:14px">Or copy this address into your browser:<br>${escapeHtml(url)}</p>
</body>
</html>`;
}

/** The sentence that goes around the example, the same in every brief. */
export const COPY_PAGE_RULES =
  "Copy the page exactly as it is, change only the marked values, and show it as a web page in your sandbox browser (an `.html` file, or the HTML preview). Do not add scripts, do not add `target` to the form, do not wrap the button in anything else, and do not press anything yourself. If the person says a button does nothing, tell them to use the link under it, or to copy the written address into their browser.";
