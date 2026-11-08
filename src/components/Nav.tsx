
"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import { db } from "@/lib/supabase";

import {
  startPresence,
  stopPresence,
} from "@/lib/presence";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    void startPresence();

    return () => {
      void stopPresence();
    };
  }, []);

  async function logout() {
    await stopPresence();

    const { error } = await db().auth.signOut();

    if (error) {
      console.error(
        "Erro ao terminar sessão:",
        error.message
      );
      return;
    }

    router.replace("/login");
  }

  function isActive(path: string) {
    return (
      pathname === path ||
      (path !== "/" &&
        pathname.startsWith(path + "/"))
    );
  }

  return (
    <nav
      className="nav"
      aria-label="Navegação principal"
    >
      <Link href="/" className="brand">
        link
        <span style={{ color: "#FF796F" }}>
          .
        </span>
      </Link>

      <Link
        href="/conexoes"
        aria-current={
          isActive("/conexoes")
            ? "page"
            : undefined
        }
      >
        Conexões
      </Link>

      <Link
        href="/mensagens"
        aria-current={
          isActive("/mensagens")
            ? "page"
            : undefined
        }
      >
        Mensagens
      </Link>

      <Link
        href="/perfil"
        aria-current={
          isActive("/perfil")
            ? "page"
            : undefined
        }
      >
        Meu perfil
      </Link>

      <button
        type="button"
        className="btn2"
        onClick={logout}
      >
        Sair
      </button>
    </nav>
  );
}
