import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DoctorAvatar } from "@/components/booking/doctor-avatar";
import BookingWizard from "@/app/(site)/reservar/booking-wizard";

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

describe("DoctorAvatar y Paso 2 de reserva", () => {
  it("muestra iniciales limpias cuando no hay avatarUrl", () => {
    act(() => {
      root.render(<DoctorAvatar name="Dra. Sofía Morales" avatarUrl={null} />);
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("SM");
  });

  it("renderiza la foto del profesional cuando avatarUrl está presente", () => {
    act(() => {
      root.render(
        <DoctorAvatar
          name="Dr. Carlos Díaz"
          avatarUrl="/api/doctors/doc-1/avatar?v=abc"
        />,
      );
    });

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("/api/doctors/doc-1/avatar");
    expect(img?.getAttribute("alt")).toBe("Dr. Carlos Díaz");
  });

  it("muestra foto o iniciales de los profesionales en el paso 2 del BookingWizard", () => {
    act(() => {
      root.render(
        <BookingWizard
          services={[{ id: "srv-1", name: "Control dental", duration_min: 30 }]}
          doctors={[
            {
              id: "doc-1",
              full_name: "Dra. Sofía Morales",
              specialty: "Odontología General",
              avatar_url: "/api/doctors/doc-1/avatar?v=123",
            },
            {
              id: "doc-2",
              full_name: "Dr. Carlos Díaz",
              specialty: "Ortodoncia",
              avatar_url: null,
            },
          ]}
          holidays={[]}
          maxDaysAhead={30}
          minNoticeHours={2}
          cancelMinHours={12}
          clinicName="Clínica Sonrisa"
          timezone="America/Santiago"
        />,
      );
    });

    const firstService = container.querySelector('input[name="servicio"]') as HTMLInputElement;
    act(() => {
      firstService.click();
    });

    const nextBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Elegir profesional"),
    );
    act(() => {
      nextBtn?.click();
    });

    expect(container.textContent).toContain("Dra. Sofía Morales");
    expect(container.textContent).toContain("Dr. Carlos Díaz");
    expect(container.textContent).toContain("CD");
    const img = container.querySelector('img[alt="Dra. Sofía Morales"]');
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("/api/doctors/doc-1/avatar");
  });
});

