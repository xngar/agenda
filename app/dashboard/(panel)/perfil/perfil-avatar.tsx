"use client";

import Image from "next/image";
import { useState } from "react";
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
  const avatarToken = avatar?.avatarToken ?? "0";
  const shouldShowImage = avatar ? avatar.hasAvatar : true;
  const srcKey = `${profileId}:${avatarToken}-${avatarVersion}`;
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const showImage = shouldShowImage && failedKey !== srcKey;

  return (
    <span
      aria-hidden="true"
      className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-navy-50 text-2xl font-bold text-action-primary"
    >
      {showImage ? (
        <Image
          key={srcKey}
          src={`/api/dashboard/profile/avatar?profile=${encodeURIComponent(profileId)}&v=${encodeURIComponent(`${avatarToken}-${avatarVersion}`)}`}
          alt=""
          fill
          sizes="96px"
          priority
          unoptimized
          className="object-cover"
          onError={() => setFailedKey(srcKey)}
        />
      ) : null}
      <span>{initials || fullName.charAt(0).toUpperCase() || "?"}</span>
    </span>
  );
}
