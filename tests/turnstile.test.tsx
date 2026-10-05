import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Turnstile from "@/components/turnstile";

/**
 * El token de Cloudflare Turnstile es de UN SOLO USO.
 *
 * El bug que esto fija: si el primer intento de reserva fallaba, el
 * asistente reenviaba el mismo token ya gastado y Cloudflare lo rechazaba,
 * de modo que el paciente no podía reintentar nunca. Se arregló incrementando
 * `resetKey` tras cada intento, pero el componente tenía el parámetro
 * muerto: el guard `if (widgetId.current) return` impedía que el widget se
 * volviera a crear y nadie pasaba el prop.
 */

const SITE_KEY = "clave-de-prueba";

let root: Root;
let container: HTMLDivElement;
let renderMock: ReturnType<typeof vi.fn>;
let resetMock: ReturnType<typeof vi.fn>;
let removeMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = SITE_KEY;

  renderMock = vi.fn(() => "widget-1");
  resetMock = vi.fn();
  removeMock = vi.fn();
  window.turnstile = {
    render: renderMock,
    reset: resetMock,
    remove: removeMock,
  } as unknown as Window["turnstile"];

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete window.turnstile;
  document.querySelectorAll("script[data-agenda-turnstile]").forEach((s) => s.remove());
});

/** Monta el componente y devuelve los tokens que entrega. */
function montar(props: { resetKey?: number }) {
  const tokens: string[] = [];
  act(() => {
    root.render(
      <Turnstile
        resetKey={props.resetKey ?? 0}
        onToken={(t) => {
          tokens.push(t);
        }}
      />,
    );
  });
  return tokens;
}

describe("Turnstile", () => {
  it("crea el widget una sola vez", () => {
    montar({});
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("entrega el token que Cloudflare emite", () => {
    const tokens = montar({});

    const opciones = renderMock.mock.calls[0]![1] as {
      callback: (t: string) => void;
    };
    act(() => opciones.callback("token-abc"));

    expect(tokens).toEqual(["token-abc"]);
  });

  it("no reconstruye el widget si cambia el callback del padre", () => {
    montar({});
    // Cambiar la función callback no debe crear un segundo widget sobre el
    // mismo contenedor: eso dejaba un widget huérfano y el token sin usar.
    act(() => {
      root.render(<Turnstile resetKey={0} onToken={() => {}} />);
    });
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(resetMock).not.toHaveBeenCalled();
  });

  it("reinicia el widget y anula el token cuando cambia resetKey", () => {
    const tokens = montar({ resetKey: 0 });

    const opciones = renderMock.mock.calls[0]![1] as {
      callback: (t: string) => void;
    };
    act(() => opciones.callback("token-gastado"));
    expect(tokens).toEqual(["token-gastado"]);

    act(() => {
      root.render(<Turnstile resetKey={1} onToken={(t) => tokens.push(t)} />);
    });

    expect(resetMock).toHaveBeenCalledWith("widget-1");
    // El token anterior queda vacío: no se puede reenviar.
    expect(tokens.at(-1)).toBe("");
  });

  it("elimina el widget al desmontar", () => {
    montar({});
    act(() => root.unmount());
    expect(removeMock).toHaveBeenCalledWith("widget-1");
  });

  it("sin site key no renderiza nada y avisa que está desactivado", () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    montar({});
    expect(renderMock).not.toHaveBeenCalled();
    expect(container.textContent).toMatch(/anti-bot desactivada/i);
  });
});