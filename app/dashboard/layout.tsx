/**
 * Layout mínimo del área `/dashboard`.
 *
 * Deliberadamente NO exige sesión aquí: este layout también envuelve
 * `/dashboard/login`, y si exigiera sesión redirigiría al propio login
 * en bucle. La comprobación real vive en `(panel)/layout.tsx`, que solo
 * envuelve las páginas privadas mediante el route group.
 */
export default function DashboardRoot({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}