"use client";

import Image from "next/image";
import { useState } from "react";
import { Users } from "lucide-react";

function getInitials(name: string): string {
  const cleaned = name
    .trim()
    .replace(/^(dr\.?|dra\.?|sr\.?|sra\.?)\s+/i, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

const SIZE_CLASSES = {
  md: "h-12 w-12 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

export function DoctorAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !failed;
  const initials = getInitials(name);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-brand-navy-50 font-bold text-action-primary ${SIZE_CLASSES[size]}`}
    >
      {showImage ? (
        <Image
          src={avatarUrl!}
          alt={name}
          fill
          sizes={size === "lg" ? "56px" : "48px"}
          priority
          unoptimized
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

export function AnyDoctorAvatar({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border border-[var(--lp-sky-200)] bg-[var(--lp-sky-100)] text-[var(--lp-navy)] ${SIZE_CLASSES[size]}`}
    >
      <Users className="h-5 w-5" />
    </span>
  );
}

