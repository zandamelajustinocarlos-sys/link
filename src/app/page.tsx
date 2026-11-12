
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Nav from "@/components/Nav";
import Guard from "@/components/Guard";
import ProfilePhotoViewer from "@/components/ProfilePhotoViewer";
import LinkIcon from "@/components/LinkIcon";
import { db } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string;
  course: string | null;
  study_year: number | null;
  avatar_url: string | null;
};

const menuItems = [
  {
    href: "/",
    label: "Início",
    icon: "home",
  },
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
] as const;

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStudents() {
      try {
        const supabase = db();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setError("Sessão não encontrada.");
          return;
        }

        const { data, error: queryError } =
          await supabase
            .from("students")
            .select(
              "id,full_name,course,study_year,avatar_url"
            )
            .neq("id", user.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(6);

        if (!active) return;

        if (queryError) {
          setError(
            "Não foi possível carregar os estudantes."
          );
          return;
        }

        setStudents((data || []) as Student[]);
      } catch {
        if (active) {
          setError("Erro ao carregar a comunidade.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      active = false;
    };
  }, []);

  function avatarUrl(path: string | null) {
    if (!path) return null;

    if (
      path.startsWith("https://") ||
      path.startsWith("http://")
    ) {
      return path;
    }

    return db().storage
      .from("avatars")
      .getPublicUrl(path)
      .data.publicUrl;
  }

  return (
    <Guard>
      <main className="shell link-home">
        <Nav />

        <div className="link-home-layout">
          {/* MENU LATERAL DESKTOP */}
          <aside className="link-home-sidebar">
            <nav
              className="link-side-menu"
              aria-label="Navegação lateral"
            >
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`link-side-link ${
                    item.href === "/"
                      ? "is-active"
                      : ""
                  }`}
                  aria-current={
                    item.href === "/"
                      ? "page"
                      : undefined
                  }
                >
                  <LinkIcon
                    name={item.icon}
                    size={22}
                  />

                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="link-side-note">
              <strong>Comunidade UP-Maputo</strong>

              <p>
                Conhece colegas, partilha conhecimentos
                e cria oportunidades de colaboração.
              </p>
            </div>
          </aside>

          {/* CONTEÚDO PRINCIPAL */}
          <div className="link-home-feed">
            <section className="link-welcome">
              <p className="link-eyebrow">
                COMUNIDADE UNIVERSITÁRIA
              </p>

              <h1>
                Pessoas certas.
                <br />
                Novas possibilidades
                <span>.</span>
              </h1>

              <p>
                Descobre estudantes, troca ideias
                e constrói a tua rede na UP-Maputo.
              </p>
            </section>

            {/* DESCOBERTA DE ESTUDANTES */}
            <section
              className="link-feed-card"
              aria-labelledby="discover-title"
            >
              <div className="link-section-heading">
                <div>
                  <h2 id="discover-title">
                    Descobre pessoas
                  </h2>

                  <p>
                    Conhece estudantes da tua comunidade.
                  </p>
                </div>

                <Link href="/conexoes">
                  Ver todos
                </Link>
              </div>

              {loading ? (
                <p className="muted">
                  A carregar estudantes...
                </p>
              ) : error ? (
                <p className="error" role="alert">
                  {error}
                </p>
              ) : students.length === 0 ? (
                <div className="link-empty">
                  <p>
                    Ainda não existem outros estudantes
                    disponíveis para apresentar.
                  </p>
                </div>
              ) : (
                <div className="link-student-list">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="link-student-row"
                    >
                      <ProfilePhotoViewer
                        name={student.full_name}
                        avatarUrl={avatarUrl(
                          student.avatar_url
                        )}
                        profileHref={
                          `/estudantes/${student.id}`
                        }
                        size={46}
                      />

                      <div className="link-student-info">
                        <Link
                          href={
                            `/estudantes/${student.id}`
                          }
                          className="link-student-name"
                        >
                          {student.full_name}
                        </Link>

                        <p>
                          {student.course ||
                            "Curso não informado"}

                          {student.study_year
                            ? ` · ${student.study_year}.º ano`
                            : ""}
                        </p>
                      </div>

                      <Link
                        href={
                          `/estudantes/${student.id}`
                        }
                        className="link-small-action"
                      >
                        Ver perfil
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* PROJECTOS E OPORTUNIDADES */}
            <section className="link-feed-card">
              <div className="link-section-heading">
                <div>
                  <h2>
                    Projectos e oportunidades
                  </h2>

                  <p>
                    Um espaço para aprender e colaborar.
                  </p>
                </div>
              </div>

              <div className="link-feature-preview">
                <div
                  className="link-feature-icon"
                  aria-hidden="true"
                >
                  <LinkIcon
                    name="plus"
                    size={24}
                  />
                </div>

                <div>
                  <h3>
                    As boas ideias começam
                    com conexões.
                  </h3>

                  <p>
                    Em breve, poderás descobrir
                    projectos académicos e
                    oportunidades partilhadas
                    por outros estudantes.
                  </p>
                </div>
              </div>

              <Link
                href="/conexoes"
                className="btn"
              >
                Explorar a comunidade
              </Link>
            </section>
          </div>

          {/* COLUNA DIREITA DESKTOP */}
          <aside className="link-home-right">
            <section className="link-feed-card">
              <h2>Começa por aqui</h2>

              <p className="muted">
                Torna o teu perfil mais interessante
                para outros estudantes.
              </p>

              <Link
                href="/perfil/editar"
                className="link-quick-link"
              >
                <span>Completar perfil</span>
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/conexoes"
                className="link-quick-link"
              >
                <span>Encontrar colegas</span>
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/mensagens"
                className="link-quick-link"
              >
                <span>Abrir conversas</span>
                <span aria-hidden="true">→</span>
              </Link>
            </section>

            <p className="link-footer-note">
              link. — Uma comunidade de estudantes,
              criada para gerar conexões.
            </p>
          </aside>
        </div>
      </main>
    </Guard>
  );
}
