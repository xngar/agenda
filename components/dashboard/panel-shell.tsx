"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

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
      className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
    >
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-control bg-gradient-to-b from-brand-navy to-brand-navy-900 text-white shadow-panel ${
          compact ? "h-9 w-9" : "h-10 w-10"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={compact ? "h-[18px] w-[18px]" : "h-5 w-5"}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      </span>
      <span className="min-w-0 leading-tight">
        <span
          className={`block truncate font-semibold text-panel-ink ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          Agenda
        </span>
        {compact ? null : (
          <span className="block truncate text-[11px] font-medium tracking-wide text-panel-muted">
            Panel
          </span>
        )}
      </span>
    </Link>
  );
}

function SidebarSections({
  isAdmin,
  isSuperAdmin,
  profileTrigger,
  logout,
  onNavigate,
  onAccountAction,
}: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  profileTrigger: ReactNode;
  logout: ReactNode;
  onNavigate?: () => void;
  onAccountAction?: () => void;
}) {
  return (
    <>
      <div className="shrink-0 px-3 pb-4 pt-1" onClick={onAccountAction}>
        {profileTrigger}
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <SidebarNav
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          onNavigate={onNavigate}
        />
      </div>

      <div
        className="shrink-0 border-t border-panel-line p-3"
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="panel-shell min-h-dvh">
      <a href="#contenido-panel" className="skip-link">
        Saltar al contenido
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-panel-line bg-white xl:flex">
        <div className="flex h-[72px] shrink-0 items-center px-5">
          <Logo />
        </div>
        <SidebarSections
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          profileTrigger={profileTrigger}
          logout={logout}
        />
      </aside>

      <div className="xl:pl-[264px]">
        <header className="sticky top-0 z-30 border-b border-panel-line bg-panel-bg xl:hidden">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Abrir menú"
              title="Abrir menú"
              aria-haspopup="dialog"
              aria-expanded={menuAbierto}
              aria-controls="menu-panel-movil"
              onClick={() => setMenuAbierto(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-panel-line bg-white text-panel-ink transition-colors hover:bg-panel-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <Logo compact />
          </div>
        </header>

        <div
          id="contenido-panel"
          tabIndex={-1}
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-6 focus-visible:outline-none xl:px-8 xl:py-8"
        >
          {children}
        </div>
      </div>

      <Sheet open={menuAbierto} onOpenChange={setMenuAbierto}>
        <SheetContent
          side="left"
          showCloseButton={false}
          id="menu-panel-movil"
          className="panel-sheet w-[280px] max-w-[86vw] gap-0 border-panel-line bg-white p-0 shadow-[var(--panel-shadow-lift)]"
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
