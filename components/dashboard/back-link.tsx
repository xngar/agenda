import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Enlace de regreso al panel, con el mismo peso visual en todas las páginas. */
export function BackLink({
  href = "/dashboard",
  children = "Volver a la agenda",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-action-primary"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      {children}
    </Link>
  );
}
