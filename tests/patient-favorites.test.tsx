import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FavoriteStarButton } from "@/app/dashboard/(panel)/pacientes/favorite-star-button";
import { PatientTabs } from "@/app/dashboard/(panel)/pacientes/patient-tabs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe("FavoriteStarButton", () => {
  it("renderiza como no favorito y cambia a favorito al hacer clic", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ patientId: "p1", favorite: true }),
    });
    globalThis.fetch = fetchMock;

    await act(async () => {
      root.render(<FavoriteStarButton patientId="p1" initialFavorite={false} />);
    });

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toBe("Marcar como favorito");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ficha/patients/p1/favorite",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ favorite: true }),
      }),
    );
    expect(button?.getAttribute("aria-label")).toBe("Quitar de favoritos");
  });
});

describe("PatientTabs", () => {
  it("muestra las pestañas de Todos y Favoritos con su contador", async () => {
    await act(async () => {
      root.render(
        <PatientTabs activeTab="all" favoritesCount={4} q="juan" status="active" />,
      );
    });

    const links = Array.from(container.querySelectorAll("a"));
    expect(links).toHaveLength(2);

    const todosLink = links[0];
    const favLink = links[1];

    expect(todosLink.textContent).toContain("Todos");
    expect(favLink.textContent).toContain("Favoritos");
    expect(favLink.textContent).toContain("4");

    expect(favLink.getAttribute("href")).toContain("tab=favorites");
    expect(favLink.getAttribute("href")).toContain("q=juan");
  });
});

