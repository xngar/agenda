"use client";

import Image from "next/image";
import { usePerfilAvatar } from "./perfil-sheet-provider";

export function PerfilAvatar({
  initials,
  fullName,
  profileId,
}: {
  initials: string;
  fullName: string;
  profileId: string;
}) {
  const avatar = usePerfilAvatar();
  const avatarVersion = avatar?.avatarVersion ?? 0;

  return (
    <span
      aria-hidden="true"
      className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-navy-50 text-2xl font-bold text-action-primary"
    >
      <Image
        key={`${profileId}:${avatarVersion}`}
        src={`/api/dashboard/profile/avatar?profile=${encodeURIComponent(profileId)}&v=${avatarVersion}`}
        alt=""
        fill
        sizes="96px"
        unoptimized
        className="object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <span>{initials || fullName.charAt(0).toUpperCase() || "?"}</span>
    </span>
  );
}
