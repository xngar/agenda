import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Chequeo OPTIMISTA de sesión para `/dashboard`.
 *
 * Esto NO es la autorización: sólo evita pintar la pantalla de login a
 * alguien que claramente no tiene sesión y evita descargar el JS del
 * panel. La autoridad real es `getDoctorSession()` / `requireDoctor()` en
 * cada página del panel, que validan contra la base (que exista un
 * `doctors`, que esté `active`, y qué `is_admin` tiene).
 *
 * El rol NO se decide aquí a propósito: leer `is_admin` exigiría una
 * consulta a la base en cada navegación, y un proxy es el sitio
 * equivocado para una comprobación de seguridad. Un cookie firmado con
 * el rol sería autoritativo y peligroso (revocar un admin sería esperar
 * que expire el token); por eso el rol se lee siempre de la fila en
 * `doctors`.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // El refresh de sesión ocurre en la respuesta; hay que copiar las
          // cookies tanto a `request` (para los Server Components que se
          // ejecutan en esta misma pasada) como a `response`.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // `getClaims()` valida la firma del JWT contra la clave de la proyecto.
  // No se usa `getUser()` a propósito: eso hace una llamada de red a Supabase
  // en CADA navegación por cada usuario del panel.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);

  const esDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const esLogin = pathname === "/dashboard/login";

  if (esDashboard && !esLogin && !loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Ya autenticado: no tiene sentido mostrarle el login.
  if (esLogin && loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};