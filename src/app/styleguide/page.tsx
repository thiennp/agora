import type { Metadata } from "next";

import {
  AlertsSection,
  AvatarsSection,
  BadgesSection,
  ButtonsSection,
  ChartsSection,
  ColorsSection,
  FormsSection,
  ImagesSection,
  LogoSection,
  ModalsSection,
  StyleguideFrame,
  SurfacesSection,
  TablesSection,
} from "@/features/styleguide/public-api/presentation";

export const metadata: Metadata = {
  title: "Design system | Agora",
  description: "Agora design system reference: logo, colors, surfaces, buttons, alerts, forms, tables and charts.",
};

export default function StyleguidePage() {
  return (
    <StyleguideFrame>
      <LogoSection />
      <ColorsSection />
      <SurfacesSection />
      <ButtonsSection />
      <AlertsSection />
      <BadgesSection />
      <AvatarsSection />
      <ImagesSection />
      <ModalsSection />
      <FormsSection />
      <TablesSection />
      <ChartsSection />
    </StyleguideFrame>
  );
}
