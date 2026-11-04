
"use client";

import Link from "next/link";
import Nav from "@/components/Nav";
import Guard from "@/components/Guard";


export default function Home() {
  return (
    <Guard>
      <main className="shell">
        <Nav />

        <section className="card">
          <p className="muted">
            Comunidade universitária · UP-Maputo
          </p>

          <h1>
            Conecta-te com pessoas e ideias.
          </h1>

          <p>
            Encontra estudantes, estabelece conexões
            e conversa em privado ou em grupo.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 22,
            }}
          >
            <Link
              className="btn"
              href="/conexoes"
            >
              Explorar estudantes
            </Link>

            <Link
              className="btn2"
              href="/mensagens"
            >
              Abrir mensagens
            </Link>
          </div>
        </section>
      </main>
    </Guard>
  );
}
