"use client";

import Image from "next/image";
import { usePerfilAvatar } from "./perfil-sheet-provider";

export function PerfilAvatar({
  initials,
  fullName,
}: {
  initials: string;
  fullName: string;
}) {
  const avatar = usePerfilAvatar();

  return (
    <span
      aria-hidden="true"
      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-navy-50 text-lg font-bold text-action-primary"
    >
      <Image
        key={avatar?.avatarVersion ?? 0}
        src={`/api/dashboard/profile/avatar?v=${avatar?.avatarVersion ?? 0}`}
        alt=""
        fill
        sizes="64px"
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
