import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TeamList } from "@/app/dashboard/(panel)/admin/team-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const MIEMBROS = [
  {
    id: "1",
    full_name: "Camila Rojas",
    specialty: "Endodoncia",
    role: "professional" as const,
    is_admin: false,
    active: true,
    email: "camila@clinica.cl",
  },
  {
    id: "2",
    full_name: "Sebastián Muñoz",
    specialty: null,
    role: "professional" as const,
    is_admin: false,
    active: true,
    email: null,
  },
];

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("TeamList", () => {
  it("muestra el correo del miembro y un guion si no lo tiene", () => {
    act(() => {
      root.render(<TeamList initial={MIEMBROS} selfId="999" />);
    });

    expect(container.textContent).toContain("camila@clinica.cl");
    expect(container.textContent).toContain("—");
  });
});
