import { Avatar, AvatarStack, type AvatarSize } from "@/components/ui";

import { Demo, Section } from "../Block";

const SIZES: AvatarSize[] = ["xs", "sm", "md", "lg", "xl"];

export function AvatarsSection() {
  return (
    <Section id="avatars" title="Avatars">
      <Demo title="Sizes" note="Initials only. Members have no photos in Agora.">
        <div className="flex flex-wrap items-center gap-4">
          {SIZES.map((s) => (
            <Avatar key={s} name="Mia Larsen" size={s} />
          ))}
        </div>
      </Demo>
      <Demo title="Presence">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name="Mia Larsen" presence="online" />
          <Avatar name="Jonas Weber" presence="away" />
          <Avatar name="Aiko Tanaka" presence="offline" />
        </div>
      </Demo>
      <Demo title="Stack">
        <AvatarStack names={["Mia Larsen", "Jonas Weber", "Aiko Tanaka", "Sam Okoye", "Lena Petrov", "Omar Haddad"]} max={4} />
      </Demo>
    </Section>
  );
}
