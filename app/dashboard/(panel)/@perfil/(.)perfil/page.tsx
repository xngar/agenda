import { PerfilSheetRoute } from "../../perfil/perfil-sheet-route";

/**
 * Hoja de perfil sobre la página actual: la ruta se intercepta desde el slot
 * paralelo `@perfil`, de modo que la página de debajo (agenda, pacientes, ficha)
 * queda montada y solo se atenúa.
 */
export default function PerfilSheetInterceptedPage() {
  return <PerfilSheetRoute volverAtras />;
}