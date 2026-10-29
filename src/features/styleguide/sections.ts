/** The parts of the page, in order. `id` is the URL fragment, so it stays lower-case letters and dashes. */
export const SECTIONS = [
  { id: "logo", label: "Logo" },
  { id: "colors", label: "Colors" },
  { id: "surfaces", label: "Surfaces" },
  { id: "buttons", label: "Buttons" },
  { id: "alerts", label: "Alerts" },
  { id: "badges", label: "Badges" },
  { id: "avatars", label: "Avatars" },
  { id: "images", label: "Images" },
  { id: "modals", label: "Modals" },
  { id: "forms", label: "Form controls" },
  { id: "tables", label: "Tables" },
  { id: "charts", label: "Charts" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
