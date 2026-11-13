"use client";

import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

const SIDEBAR_STORAGE_KEY = "panel:sidebar-collapsed";
const SIDEBAR_EVENT = "panel:sidebar-collapsed-change";
let fallbackCollapsed = false;

function leerSidebarColapsado(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return fallbackCollapsed;
  }
}

function suscribirSidebarColapsado(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SIDEBAR_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SIDEBAR_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SIDEBAR_EVENT, onStoreChange);
  };
}

function guardarSidebarColapsado(next: boolean) {
  fallbackCollapsed = next;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Sin acceso a localStorage
  }
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

function Logo({
  onClick,
  compact = false,
}: {
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <Link
      href="/dashboard"
      aria-label="Ir a la agenda"
      onClick={onClick}
      className="flex min-w-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
    >
      <img
        src="/gethour.svg"
        alt="GetHour"
        className={`w-auto max-w-full ${compact ? "h-5" : "h-[25px]"}`}
      />
    </Link>
  );
}

function SidebarSections({
  isAdmin,
  isSuperAdmin,
  collapsed = false,
  profileTrigger,
  logout,
  onNavigate,
  onAccountAction,
}: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  collapsed?: boolean;
  profileTrigger: ReactNode;
  logout: ReactNode;
  onNavigate?: () => void;
  onAccountAction?: () => void;
}) {
  return (
    <>
      <div className={`shrink-0 pb-4 pt-1 ${collapsed ? "px-2" : "px-3"}`} onClick={onAccountAction}>
        {profileTrigger}
      </div>

      <div className={`no-scrollbar min-h-0 flex-1 overflow-y-auto pb-4 ${collapsed ? "px-2" : "px-3"}`}>
        <SidebarNav
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>

      <div
        className={`shrink-0 border-t border-panel-line ${collapsed ? "p-2" : "p-3"}`}
        onClick={onAccountAction}
      >
        {logout}
      </div>
    </>
  );
}

export function PanelShell({
  children,
  profileTrigger,
  logout,
  isAdmin,
  isSuperAdmin = false,
}: {
  children: ReactNode;
  profileTrigger: ReactNode;
  logout: ReactNode;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const colapsado = useSyncExternalStore(
    suscribirSidebarColapsado,
    leerSidebarColapsado,
    () => false,
  );
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function alternarColapsado() {
    guardarSidebarColapsado(!colapsado);
  }

  return (
    <div className="panel-shell min-h-dvh">
      <a href="#contenido-panel" className="skip-link">
        Saltar al contenido
      </a>

      <aside
        data-collapsed={colapsado ? "true" : "false"}
        className={`group/sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-panel-line bg-white transition-[width] duration-element ease-out-soft xl:flex ${
          colapsado ? "w-[72px]" : "w-[264px]"
        }`}
      >
        <div
          className={`flex h-[72px] shrink-0 items-center ${
            colapsado ? "justify-center px-2" : "justify-between pl-5 pr-3"
          }`}
        >
          {!colapsado ? <Logo /> : null}
          <button
            type="button"
            onClick={alternarColapsado}
            aria-label={colapsado ? "Expandir menú lateral" : "Colapsar menú lateral"}
            title={colapsado ? "Expandir menú lateral" : "Colapsar menú lateral"}
            aria-expanded={!colapsado}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-panel-muted transition-colors duration-micro ease-out-soft hover:bg-panel-hover hover:text-action-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
          >
            {colapsado ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>
        <SidebarSections
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          collapsed={colapsado}
          profileTrigger={profileTrigger}
          logout={logout}
        />
      </aside>

      <div
        className={`transition-[padding] duration-element ease-out-soft ${
          colapsado ? "xl:pl-[72px]" : "xl:pl-[264px]"
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-panel-line bg-panel-bg xl:hidden">
          <div className="mx-auto grid h-14 max-w-6xl grid-cols-[44px_1fr_44px] items-center px-4">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Abrir menú"
              title="Abrir menú"
              aria-haspopup="dialog"
              aria-expanded={menuAbierto}
              aria-controls="menu-panel-movil"
              onClick={() => setMenuAbierto(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center justify-self-start rounded-control border border-panel-line bg-white text-panel-ink transition-colors hover:bg-panel-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="justify-self-center">
              <Logo compact />
            </div>
            <span aria-hidden="true" />
          </div>
        </header>

        <div
          id="contenido-panel"
          tabIndex={-1}
          className={`mx-auto scroll-mt-20 px-4 py-6 focus-visible:outline-none xl:px-8 xl:py-8 ${
            colapsado ? "max-w-none" : "max-w-6xl"
          }`}
        >
          {children}
        </div>
      </div>

      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent
          side="left"
          showCloseButton={false}
          floating={false}
          id="menu-panel-movil"
          className="panel-sheet w-[280px] max-w-[86vw] gap-0 border-panel-line bg-white p-0"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuButtonRef.current?.focus();
          }}
        >
          <SheetTitle className="sr-only">Menú del panel</SheetTitle>
          <SheetDescription className="sr-only">Secciones del panel</SheetDescription>

          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-panel-line px-4">
            <Logo onClick={() => setMenuAbierto(false)} />
            <button
              type="button"
              aria-label="Cerrar menú"
              title="Cerrar menú"
              onClick={() => setMenuAbierto(false)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-panel-muted transition-colors hover:bg-panel-hover hover:text-panel-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <SidebarSections
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            profileTrigger={profileTrigger}
            logout={logout}
            onNavigate={() => setMenuAbierto(false)}
            onAccountAction={() => setMenuAbierto(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
