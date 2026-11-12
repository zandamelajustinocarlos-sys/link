
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import LinkIcon, {
  type LinkIconName,
} from "@/components/LinkIcon";

import Sidebar from "@/components/Sidebar";
import { db } from "@/lib/supabase";

type Destination = {
  href: string;
  label: string;
  icon: LinkIconName;
};

const destinations: Destination[] = [
  {
    href: "/",
    label: "Início",
    icon: "home",
  },
  {
    href: "/conexoes",
    label: "Conexões",
    icon: "users",
  },
  {
    href: "/mensagens",
    label: "Mensagens",
    icon: "messages",
  },
  {
    href: "/perfil",
    label: "Perfil",
    icon: "user",
  },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const [accountOpen, setAccountOpen] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const [publishOpen, setPublishOpen] =
    useState(false);

  const isMessagesPage =
    pathname === "/mensagens" ||
    pathname.startsWith("/mensagens/");

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (
      href === "/conexoes" &&
      pathname.startsWith("/estudantes/")
    ) {
      return true;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  async function signOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      const { error } =
        await db().auth.signOut();

      if (error) {
        throw error;
      }

      setAccountOpen(false);

      router.replace("/login");
      router.refresh();
    } catch {
      setSigningOut(false);

      window.alert(
        "Não foi possível terminar a sessão."
      );
    }
  }

  return (
    <>
      {/* MENU LATERAL DESKTOP */}

      {!isMessagesPage && <Sidebar />}

      {/* HEADER FIXO */}

      <header className="link-header">
        <div className="link-header-inner">

          <div className="link-header-left">

            <Link
              href="/"
              className="brand"
              aria-label="link. — Início"
            >
              link<span>.</span>
            </Link>

            {isMessagesPage ? (
              <Link
                href="/"
                className="link-messages-back-header"
                aria-label="Voltar à página inicial"
              >
                <span aria-hidden="true">←</span>
                <span>Voltar ao início</span>
              </Link>
            ) : (
              <Link
                href="/conexoes"
                className="link-header-search"
              >
                <LinkIcon
                  name="search"
                  size={20}
                />

                <span>
                  Pesquisar estudantes
                </span>
              </Link>
            )}

          </div>

          {/* ACÇÕES DO HEADER */}

          <div className="link-header-actions">

            {!isMessagesPage && (
              <Link
                href="/mensagens"
                className="link-icon-button"
                aria-label="Abrir mensagens"
                title="Mensagens"
              >
                <LinkIcon name="messages" />
              </Link>
            )}

            {/* CONTA DO UTILIZADOR */}

            <div className="link-account">

              <button
                type="button"
                className="link-account-trigger"
                aria-label="Menu da conta"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                onClick={() =>
                  setAccountOpen((current) => !current)
                }
              >
                <LinkIcon name="user" />
              </button>

              {accountOpen && (
                <div
                  className="link-account-menu"
                  role="menu"
                >

                  <Link
                    href="/perfil"
                    role="menuitem"
                    onClick={() =>
                      setAccountOpen(false)
                    }
                  >
                    Meu perfil
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    disabled={signingOut}
                  >
                    {signingOut
                      ? "A sair..."
                      : "Terminar sessão"}
                  </button>

                </div>
              )}

            </div>

          </div>

        </div>
      </header>

      {/* NAVEGAÇÃO INFERIOR MOBILE */}

      <nav
        className="link-mobile-nav"
        aria-label="Navegação inferior"
      >

        {destinations
          .slice(0, 2)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`link-mobile-link ${
                isActive(item.href)
                  ? "is-active"
                  : ""
              }`}
              aria-current={
                isActive(item.href)
                  ? "page"
                  : undefined
              }
            >
              <LinkIcon
                name={item.icon}
              />

              <span>
                {item.label}
              </span>
            </Link>
          ))}

        {/* PUBLICAR */}

        <button
          type="button"
          className="link-mobile-link link-publish-action"
          onClick={() =>
            setPublishOpen(true)
          }
          aria-label="Publicar conteúdo"
        >
          <span className="link-publish-icon">
            <LinkIcon
              name="plus"
              size={25}
            />
          </span>

          <span>Publicar</span>
        </button>

        {destinations
          .slice(2)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`link-mobile-link ${
                isActive(item.href)
                  ? "is-active"
                  : ""
              }`}
              aria-current={
                isActive(item.href)
                  ? "page"
                  : undefined
              }
            >
              <LinkIcon
                name={item.icon}
              />

              <span>
                {item.href === "/mensagens"
                  ? "Chats"
                  : item.label}
              </span>
            </Link>
          ))}

      </nav>

      {/* MODAL DE PUBLICAÇÕES */}

      {publishOpen && (
        <div
          className="link-modal-backdrop"
          onClick={() =>
            setPublishOpen(false)
          }
        >
          <section
            className="link-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <h2 id="publish-title">
              Publicações na link.
            </h2>

            <p>
              Estamos a preparar o espaço
              onde poderás partilhar
              projectos, ideias e
              oportunidades com outros
              estudantes.
            </p>

            <button
              type="button"
              className="btn"
              onClick={() =>
                setPublishOpen(false)
              }
            >
              Entendido
            </button>

          </section>
        </div>
      )}

    </>
  );
}
