"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PublicDoctor } from "@/lib/types";

/**
 * Filtro por profesional, para quienes ven toda la agenda (admin y
 * recepción). Combobox de shadcn (botón + popover con buscador): con
 * hartos profesionales el `<select>` nativo obliga a scrollear a ciegas.
 *
 * Va por la URL (`?doctor=`) y no con estado local: así la agenda se
 * puede recargar, compartir y refrescar desde Realtime sin perder el
 * filtro.
 */
export function DoctorPicker({
  current,
  canFilter,
  doctors,
  basePath = "/dashboard",
  allOption = true,
  mostrarEtiqueta = true,
}: {
  current: string | null;
  canFilter: boolean;
  doctors?: PublicDoctor[];
  /** Sección desde la que se navega: la agenda usa /dashboard, el horario, /dashboard/horario. */
  basePath?: string;
  /**
   * En la agenda "Todo el equipo" significa algo (ve todas las citas). En el
   * horario no: hay que editar el horario de UN profesional, así que esa
   * opción no aparece.
   */
  allOption?: boolean;
  /**
   * La agenda alinea este control con el conmutador Día/Semana/Mes, que no
   * lleva etiqueta visible: ahí se oculta (queda sólo para lectores de
   * pantalla) y en el horario o los bloqueos se muestra.
   */
  mostrarEtiqueta?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);

  function irA(doctorId: string) {
    const params = new URLSearchParams(searchParams.toString());
    // "all" se hace explícito en la URL: sin parámetro la agenda parte en la
    // agenda propia del admin/profesional, no en la de todo el equipo.
    if (doctorId === "all") params.set("doctor", "all");
    else params.set("doctor", doctorId);

    setAbierto(false);
    startTransition(() => {
      router.push(`${basePath}${params.size ? `?${params}` : ""}`);
    });
  }

  if (!canFilter) return null;

  const opciones = [
    ...(allOption ? [{ value: "all", label: "Todo el equipo" }] : []),
    ...(doctors ?? []).map((d) => ({ value: d.id, label: d.full_name })),
  ];
  const valor = allOption && !current ? "all" : (current ?? "");
  const actual = opciones.find((o) => o.value === valor) ?? null;

  return (
    <div>
      <p
        id="filtro-doctor-label"
        className={mostrarEtiqueta ? "mb-1 block text-xs font-medium text-neutral-600" : "sr-only"}
      >
        Profesional
      </p>
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button
            id="filtro-doctor"
            variant="outline"
            role="combobox"
            aria-expanded={abierto}
            aria-labelledby="filtro-doctor-label filtro-doctor-valor"
            disabled={pending}
            className="h-11 w-full justify-between rounded-xl border-neutral-200 bg-white font-normal text-neutral-800 hover:bg-neutral-50 disabled:opacity-60 sm:w-56"
          >
            <span id="filtro-doctor-valor" className="truncate">
              {actual?.label ?? "Elegir profesional…"}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-52 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar profesional…" />
            <CommandList>
              <CommandEmpty>Ningún profesional coincide.</CommandEmpty>
              <CommandGroup>
                {opciones.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.value}`}
                    keywords={[o.label]}
                    onSelect={() => irA(o.value)}
                  >
                    <Check
                      className={cn(o.value === valor ? "opacity-100" : "opacity-0")}
                    />
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
