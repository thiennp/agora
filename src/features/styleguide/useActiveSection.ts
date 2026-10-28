"use client";

import { useEffect, useState } from "react";

import { SECTIONS, type SectionId } from "./sections";

/** Which section is currently at the top of the viewport (the last one whose top has scrolled past the header). */
export function useActiveSection(offset = 120): SectionId {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);

  useEffect(() => {
    const update = () => {
      let current: SectionId = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top - offset <= 0) current = s.id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [offset]);

  return active;
}
