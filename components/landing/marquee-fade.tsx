"use client";

import * as React from "react";
import { cn } from "cn";

interface MarqueeFadeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  repeat?: number;
}

export function MarqueeFade({
  className,
  children,
  direction = "left",
  pauseOnHover = true,
  repeat = 4,
  ...props
}: MarqueeFadeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group relative flex w-full overflow-hidden [gap:var(--marquee-gap,1.5rem)]",
        className
      )}
    >
      {/* Degenerado sutil de fade a la izquierda */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-white to-transparent sm:w-28" />

      {/* Rieles animados repetidos para bucle infinito continuo */}
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 items-center justify-around [gap:var(--marquee-gap,1.5rem)] animate-marquee",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            direction === "right" && "[animation-direction:reverse]"
          )}
          aria-hidden={i > 0}
        >
          {children}
        </div>
      ))}

      {/* Degenerado sutil de fade a la derecha */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent sm:w-28" />
    </div>
  );
}

