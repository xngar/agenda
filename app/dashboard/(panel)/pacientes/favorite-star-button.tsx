"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
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
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={favorite ? "Quitar de favoritos" : "Marcar como favorito"}
      aria-label={favorite ? "Quitar de favoritos" : "Marcar como favorito"}
      className="group relative inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-transform duration-micro active:scale-90 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-action-primary"
    >
      <Star
        className={`size-4 transition-colors duration-micro ${
          favorite
            ? "fill-amber-400 text-amber-500"
            : "text-neutral-300 group-hover:text-amber-400"
        }`}
      />
    </button>
  );
}
