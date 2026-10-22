"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { db } from "@/lib/supabase";
import {
  startPresence,
  stopPresence,
} from "@/lib/presence";

export default function Nav() {
  const router = useRouter();

  useEffect(() => {
    void startPresence();

    return () => {
      void stopPresence();
    };
  }, []);

  async function logout() {
    await stopPresence();
    await db().auth.signOut();

    router.push("/login");
  }

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        link
        <span style={{ color: "#FF796F" }}>
          .
        </span>
      </Link>

      <Link href="/conexoes">
        Conexões
      </Link>

      <Link href="/mensagens">
        Mensagens
      </Link>

      <button
        className="btn2"
        onClick={logout}
      >
        Sair
      </button>
    </nav>
  );
}