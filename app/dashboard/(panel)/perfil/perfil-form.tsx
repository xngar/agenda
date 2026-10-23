"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonClasses, inputClasses } from "@/components/ui";
import { AsyncButton } from "@/components/motion/async-button";

const MAX_AVATAR_BYTES = 200 * 1024;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function comprimirAvatar(file: File): Promise<File> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Elige una imagen JPG, PNG o WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("La imagen original no puede superar 10 MB.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const side = 512;
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la imagen.");

    const sourceSide = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - sourceSide) / 2;
    const sourceY = (bitmap.height - sourceSide) / 2;
    context.drawImage(bitmap, sourceX, sourceY, sourceSide, sourceSide, 0, 0, side, side);

    for (const quality of [0.88, 0.78, 0.68, 0.58, 0.48]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (!blob) throw new Error("No se pudo procesar la imagen.");
      if (blob.size <= MAX_AVATAR_BYTES) {
        return new File([blob], "avatar.jpg", { type: "image/jpeg" });
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error("No se pudo reducir la imagen a 200 KB. Prueba con otra foto.");
}

export function PerfilForm({
  initialName,
  initialSpecialty,
  initialHasAvatar,
  onAvatarChange,
  abierto,
  role,
  onDirtyChange,
}: {
  initialName: string;
  initialSpecialty: string | null;
  initialHasAvatar: boolean;
  onAvatarChange: (hasAvatar: boolean) => void;
  abierto: boolean;
  role: "professional" | "reception";
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initialName);
  const [specialty, setSpecialty] = useState(initialSpecialty ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [hasAvatar, setHasAvatar] = useState(initialHasAvatar);

  const dirty =
    fullName !== initialName ||
    specialty !== (initialSpecialty ?? "") ||
    avatarBusy;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;

    void (async () => {
      try {
        const response = await fetch("/api/dashboard/profile");
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          profile?: { hasAvatar?: boolean };
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo leer tu perfil");
        }
        if (!vigente) return;
        setError(null);
        const existeFoto = Boolean(data.profile?.hasAvatar);
        setHasAvatar(existeFoto);
        onAvatarChange(existeFoto);
      } catch (cause) {
        if (vigente) {
          setError(cause instanceof Error ? cause.message : "No se pudo leer tu perfil");
        }
      }
    })();

    return () => {
      vigente = false;
    };
  }, [abierto, onAvatarChange]);

  async function cambiarFoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setOk(null);
    setAvatarBusy(true);
    try {
      const avatar = await comprimirAvatar(file);
      const body = new FormData();
      body.set("avatar", avatar);
      const response = await fetch("/api/dashboard/profile/avatar", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as { error?: string; warning?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la foto.");
        return;
      }
      setHasAvatar(true);
      onAvatarChange(true);
      setOk(data.warning ?? "Foto de perfil actualizada.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo procesar la imagen.");
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function quitarFoto() {
    setError(null);
    setOk(null);
    setAvatarBusy(true);
    try {
      const response = await fetch("/api/dashboard/profile/avatar", { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string; warning?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo quitar la foto.");
        return;
      }
      setHasAvatar(false);
      onAvatarChange(false);
      setOk(data.warning ?? "Foto de perfil eliminada.");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, specialty: specialty || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar tu perfil");
        return;
      }
      setOk("Perfil actualizado.");
      router.refresh();
    } catch {
      setError("No pudimos conectarnos. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-neutral-600">
        Este nombre es el que ve el equipo en el panel y los pacientes al reservar.
      </p>
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="rounded-lg bg-success-50 px-4 py-3 text-sm text-success-700">
          {ok}
        </p>
      ) : null}
      <section aria-labelledby="perfil-foto-titulo" className="space-y-2">
        <h3 id="perfil-foto-titulo" className="text-sm font-medium text-neutral-800">Foto de perfil</h3>
        <p className="text-xs text-neutral-600">
          Opcional. Selecciona una imagen JPG, PNG o WebP; se recortará al centro y se optimizará a un máximo de 200 KB.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Seleccionar foto de perfil"
            disabled={avatarBusy}
            onChange={(event) => void cambiarFoto(event.currentTarget.files?.[0])}
          />
          <button
            type="button"
            className={buttonClasses("secondary", "md")}
            disabled={avatarBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarBusy ? "Procesando foto…" : hasAvatar ? "Cambiar foto" : "Subir foto"}
          </button>
          {hasAvatar ? (
            <button
              type="button"
              className={buttonClasses("ghost", "md")}
              disabled={avatarBusy}
              onClick={() => void quitarFoto()}
            >
              Quitar foto
            </button>
          ) : null}
        </div>
      </section>
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="perfil-nombre" className="font-medium text-neutral-800">
          Nombre completo
        </label>
        <input
          id="perfil-nombre"
          required
          minLength={3}
          maxLength={120}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClasses}
        />
      </div>
      {role === "professional" ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor="perfil-especialidad" className="font-medium text-neutral-800">
            Especialidad <span className="font-normal text-neutral-500">(opcional)</span>
          </label>
          <input
            id="perfil-especialidad"
            maxLength={80}
            autoComplete="off"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className={inputClasses}
          />
        </div>
      ) : null}
      <AsyncButton
        type="submit"
        loading={busy}
        pendingLabel="Guardando perfil"
        className={buttonClasses("primary", "lg")}
      >
        Guardar cambios
      </AsyncButton>
    </form>
  );
}