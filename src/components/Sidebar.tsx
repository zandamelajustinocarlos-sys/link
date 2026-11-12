
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "users" | "messages" | "user";

const menu: {
  href: string;
  label: string;
  icon: IconName;
}[] = [
  { href: "/", label: "Início", icon: "home" },
  {
    href: "/conexoes",
    label: "Explorar estudantes",
    icon: "users",
  },
  {
    href: "/mensagens",
    label: "Mensagens",
    icon: "messages",
  },
  {
    href: "/perfil",
    label: "Meu perfil",
    icon: "user",
  },
];

function SidebarIcon({ name }: { name: IconName }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v12h14V9" />
          <path d="M9 21v-7h6v7" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "messages":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
  }
}

export default function Sidebar() {
  const pathname = usePathname();

  // O chat utiliza toda a largura disponível.
  if (pathname.startsWith("/mensagens")) {
    return null;
  }

  return (
    <aside className="link-global-sidebar">
      <nav
        className="link-side-menu"
        aria-label="Navegação principal"
      >
        {menu.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/perfil"
                ? pathname.startsWith("/perfil")
                : item.href === "/conexoes"
                  ? pathname.startsWith("/conexoes") ||
                    pathname.startsWith("/estudantes")
                  : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`link-side-link ${
                active ? "is-active" : ""
              }`}
              aria-current={active ? "page" : undefined}
            >
              <SidebarIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="link-side-note">
        <strong>Comunidade UP-Maputo</strong>
        <p>
          Conhece colegas, partilha conhecimentos
          e cria oportunidades de colaboração.
        </p>
      </div>
    </aside>
  );
}
