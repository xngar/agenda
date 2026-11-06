import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WhatsappButton } from "@/components/dashboard/whatsapp-button";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(phone: string | null) {
  act(() => {
    root.render(
      <WhatsappButton
        patientId="11111111-1111-1111-1111-111111111111"
        fullName="Ana Pérez"
        phone={phone}
        orgName="Clínica Sonrisa"
      />,
    );
  });
}

describe("WhatsappButton", () => {
  it("abre el modal y arma el enlace wa.me con el mensaje", () => {
    render("+56 9 1234 5678");

    const boton = container.querySelector("button");
    if (!boton) throw new Error("sin botón de WhatsApp");
    expect(boton.disabled).toBe(false);

    act(() => boton.click());

    // El modal se monta en `document.body` (portal), fuera de `container`.
    const textarea = document.body.querySelector("textarea");
    if (!textarea) throw new Error("sin textarea del mensaje");
    expect(textarea.value).toContain("Clínica Sonrisa");

    const enlace = document.body.querySelector('a[href^="https://wa.me/"]');
    if (!enlace) throw new Error("sin enlace a WhatsApp");
    const href = enlace.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/56912345678?text=")).toBe(true);
    expect(decodeURIComponent(href.split("?text=")[1] ?? "")).toContain("Hola Ana");
  });

  it("deshabilita el botón cuando el teléfono no es celular", () => {
    render("+56 2 2345 6789");

    const boton = container.querySelector("button");
    if (!boton) throw new Error("sin botón de WhatsApp");
    expect(boton.disabled).toBe(true);
  });
});
