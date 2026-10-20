import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Patient } from "@/lib/ficha/types";
import { ResumenPanel } from "@/app/dashboard/(panel)/pacientes/[id]/resumen-panel";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const PACIENTE: Patient = {
  id: "pac-1",
  org_id: "org-1",
  doctor_id: "doc-1",
  doctors: { full_name: "Dra. Prueba" },
  full_name: "Ana Soto",
  nombres: "Ana",
  apellido_paterno: "Soto",
  apellido_materno: null,
  rut: "11111111-1",
  phone: "+56911111111",
  email: "ana@x.cl",
  birth_date: "1990-01-01",
  sex: "female",
  nationality: null,
  marital_status: null,
  occupation: null,
  address: null,
  comuna: null,
  region: null,
  prevision_type: null,
  fonasa_tramo: null,
  isapre_name: null,
  isapre_plan: null,
  emergency_name: null,
  emergency_relation: null,
  emergency_phone: null,
  tutor_name: null,
  tutor_rut: null,
  tutor_relation: null,
  tutor_phone: null,
  referral_source: null,
  patient_status: "active",
  admitted_at: null,
  specialty_profile: {},
  consent_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;

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

  fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({ patient: PACIENTE }),
  }));
  vi.stubGlobal("fetch", fetchMock);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

function render() {
  act(() => {
    root.render(<ResumenPanel patient={PACIENTE} orgType="dental" canEdit />);
  });
}

async function abrirEdicion() {
  render();
  const editar = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === "Editar",
  );
  act(() => {
    editar?.click();
  });
}

describe("ResumenPanel", () => {
  it("permite editar RUT, teléfono y correo desde Identificación", () => {
    abrirEdicion();

    expect(container.querySelector<HTMLInputElement>("#rut")?.value).toBe("11.111.111-1");
    expect(container.querySelector<HTMLInputElement>("#phone")?.value).toBe("+56 9 1111 1111");
    expect(container.querySelector<HTMLInputElement>("#email")?.value).toBe("ana@x.cl");
  });

  it("envía el teléfono corregido al guardar", async () => {
    abrirEdicion();

    const input = container.querySelector<HTMLInputElement>("#phone");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

    act(() => {
      setter?.call(input, "+56 9 8765 4321");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const form = container.querySelector("form");
    await act(async () => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const llamada = fetchMock.mock.calls.at(-1);
    expect(llamada?.[0]).toBe("/api/ficha/patients/pac-1");
    expect(llamada?.[1]?.method).toBe("PUT");

    const body = JSON.parse(String(llamada?.[1]?.body));
    expect(body.phone).toBe("+56987654321");
    expect(body.rut).toBe("111111111");
    expect(body.email).toBe("ana@x.cl");
    expect(refresh).toHaveBeenCalled();
  });
});
