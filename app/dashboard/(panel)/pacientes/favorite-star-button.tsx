"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function FavoriteStarButton({
  patientId,
  initialFavorite,
}: {
  patientId: string;
  initialFavorite: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();
  const router = useSafeRouter();

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !favorite;
    setFavorite(nextState);

    try {
      const res = await fetch(`/api/ficha/patients/${patientId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: nextState }),
      });
      if (!res.ok) {
        setFavorite(!nextState);
      } else {
        startTransition(() => {
          router?.refresh();
        });
      }
    } catch {
      setFavorite(!nextState);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-label={favorite ? "Quitar de favoritos" : "Marcar como favorito"}
          className="group relative inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 px-2 py-1 text-sm font-medium text-neutral-600 transition-colors duration-fast hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-action-primary"
        >
          <Star
            className={`size-4 transition-colors duration-fast ${favorite ? "fill-amber-400 text-amber-500" : "fill-neutral-300"}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs px-2 py-1.5 rounded-md bg-neutral-800 text-neutral-100">
        {favorite ? "Quitar de favoritos" : "Marcar como favorito"}
      </TooltipContent>
    </Tooltip>
  );
}