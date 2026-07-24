"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    tab: "home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3.75 10.5 12 3.75l8.25 6.75v9a.75.75 0 0 1-.75.75H14.25v-5.25h-4.5v5.25H4.5a.75.75 0 0 1-.75-.75v-9Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    href: "/explore",
    tab: "explore",
    label: "Explorar",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <path
          d="m16 16 3.75 3.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  {
    href: "/notifications",
    tab: "notifications",
    label: "Notificacoes",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 4.5a4.5 4.5 0 0 0-4.5 4.5v2.26c0 .72-.22 1.42-.63 2l-1.2 1.7a1.5 1.5 0 0 0 1.22 2.37h10.22a1.5 1.5 0 0 0 1.22-2.37l-1.2-1.7a3.5 3.5 0 0 1-.63-2V9A4.5 4.5 0 0 0 12 4.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.75 18.75a2.25 2.25 0 0 0 4.5 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  {
    href: "/profile",
    tab: "profile",
    label: "Perfil",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M5.25 19.5a6.75 6.75 0 0 1 13.5 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  {
    href: "/edit-profile",
    tab: "edit",
    label: "Editar Perfil",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m4.5 19.5 4.19-.84L18 9.35a1.6 1.6 0 0 0 0-2.27l-1.08-1.08a1.6 1.6 0 0 0-2.27 0l-9.31 9.31-.84 4.19Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m13.5 6 4.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  {
    href: "/settings",
    tab: "settings",
    label: "Definicoes",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 8.25A3.75 3.75 0 1 0 12 15.75A3.75 3.75 0 1 0 12 8.25z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19.2 12.75c.03-.25.05-.5.05-.75s-.02-.5-.05-.75l1.63-1.27a.75.75 0 0 0 .18-.96l-1.55-2.69a.75.75 0 0 0-.9-.34l-1.92.77a7.73 7.73 0 0 0-1.3-.75l-.29-2.03a.75.75 0 0 0-.74-.63h-3.1a.75.75 0 0 0-.74.63l-.29 2.03c-.46.18-.9.43-1.3.75l-1.92-.77a.75.75 0 0 0-.9.34L3 9.02a.75.75 0 0 0 .18.96l1.63 1.27c-.03.25-.05.5-.05.75s.02.5.05.75L3.18 14.02a.75.75 0 0 0-.18.96l1.55 2.69a.75.75 0 0 0 .9.34l1.92-.77c.4.32.84.57 1.3.75l.29 2.03a.75.75 0 0 0 .74.63h3.1a.75.75 0 0 0 .74-.63l.29-2.03c.46-.18.9-.43 1.3-.75l1.92.77a.75.75 0 0 0 .9-.34l1.55-2.69a.75.75 0 0 0-.18-.96l-1.63-1.27Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
] as const;

export function VoreShell({
  children,
  rightRail
}: {
  children: React.ReactNode;
  rightRail?: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/edit-profile") {
    return <>{children}</>;
  }

  return (
    <>
      <section id="entryGate" className="entry-gate" />

      <div id="appShell" className="app-shell">
        <header className="topbar">
          <div className="brand notranslate" translate="no">
            Vore
          </div>

          <nav id="mainNav" className="main-nav notranslate" translate="no">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tab={item.tab}
                  className={isActive ? "active" : ""}
                >
                  <span className="nav-btn-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="nav-btn-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="layout">
          <section className="screen active">{children}</section>
        </main>

        <aside id="desktopRail" className="desktop-rail" aria-label="Destaques desktop">
          {rightRail}
        </aside>
      </div>
    </>
  );
}
