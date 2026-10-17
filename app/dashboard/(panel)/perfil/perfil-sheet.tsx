"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui";
import { PerfilForm } from "./perfil-form";
import { PerfilPasswordForm } from "./perfil-password-form";

export interface PerfilSheetProfile {
  fullName: string;
  specialty: string | null;
  role: "professional" | "reception";
  roleLabel: string;
}

type Seccion = "datos" | "clave";

function Segmented({
  seccion,
  onChange,
}: {
  seccion: Seccion;
  onChange: (seccion: Seccion) => void;
}) {
  const opciones: { valor: Seccion; etiqueta: string }[] = [
    { valor: "datos", etiqueta: "Mis datos" },
    { valor: "clave", etiqueta: "Contraseña" },
  ];
  return (
    <div role="group" aria-label="Secciones del perfil" className="flex gap-1 rounded-xl bg-neutral-100 p-1">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          aria-pressed={seccion === opcion.valor}
          onClick={() => onChange(opcion.valor)}
          className={`min-h-9 flex-1 rounded-lg px-3 text-sm font-medium transition-colors ${
            seccion === opcion.valor
              ? "bg-white text-brand-navy shadow-card"
              : "text-neutral-600 hover:text-brand-navy"
          }`}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function PerfilSheet({
  profile,
  abierto,
  onCerrar,
}: {
  profile: PerfilSheetProfile;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const [seccion, setSeccion] = useState<Seccion>("datos");
  const [dirtyDatos, setDirtyDatos] = useState(false);
  const [dirtyClave, setDirtyClave] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const dirty = dirtyDatos || dirtyClave;

  function pedirCierre() {
    if (!dirty) {
      onCerrar();
      return;
    }
    setConfirmarDescarte(true);
  }

  function descartar() {
    setFormKey((k) => k + 1);
    setDirtyDatos(false);
    setDirtyClave(false);
    setConfirmarDescarte(false);
    onCerrar();
  }

  return (
    <Sheet
      open={abierto}
      onOpenChange={(next) => {
        if (!next) pedirCierre();
      }}
    >
      <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>Mi perfil</SheetTitle>
          <SheetDescription>{profile.roleLabel}. Estos datos identifican tu cuenta dentro de la clínica.</SheetDescription>
        </SheetHeader>

        <SheetMain className="px-6">
          <Segmented seccion={seccion} onChange={setSeccion} />

          <div hidden={seccion !== "datos"}>
            <PerfilForm
              key={`datos-${formKey}`}
              initialName={profile.fullName}
              initialSpecialty={profile.specialty}
              role={profile.role}
              onDirtyChange={setDirtyDatos}
            />
          </div>

          <div hidden={seccion !== "clave"}>
            <PerfilPasswordForm key={`clave-${formKey}`} onDirtyChange={setDirtyClave} />
          </div>
        </SheetMain>

        <SheetFooter className="px-6 pb-6">
          {confirmarDescarte ? (
            <>
              <p className="text-sm text-neutral-700">
                Hay cambios sin guardar en esta sección. Si los cierras se pierden.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmarDescarte(false)}>
                  Seguir editando
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={descartar}>
                  Descartar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-500">
                Para cambiar tu correo de acceso, pide ayuda a quien administre el equipo o al equipo de
                la plataforma.
              </p>
              <div className="flex justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={pedirCierre}>
                  Cerrar
                </Button>
              </div>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}