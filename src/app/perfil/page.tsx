
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Nav from "@/components/Nav";
import Guard from "@/components/Guard";
import ProfilePhotoViewer from "@/components/ProfilePhotoViewer";
import { db } from "@/lib/supabase";

type StudentProfile = {
  id: string;
  full_name: string;
  course: string | null;
  study_year: number | null;
  bio: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  interests: string[] | null;
  github_url: string | null;
  linkedin_url: string | null;
};

function safeExternalUrl(
  value: string | null,
  hostname: string
): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      (url.hostname !== hostname &&
        !url.hostname.endsWith(`.${hostname}`))
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export default function PerfilPage() {
  const [profile, setProfile] =
    useState<StudentProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const supabase = db();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setError(
            "Não foi possível identificar o estudante."
          );
          return;
        }

        const { data, error: profileError } =
          await supabase
            .from("students")
            .select(
              "id,full_name,course,study_year,bio,avatar_url,skills,interests,github_url,linkedin_url"
            )
            .eq("id", user.id)
            .single();

        if (!active) return;

        if (profileError || !data) {
          setError(
            profileError?.message ||
              "Perfil não encontrado."
          );
          return;
        }

        setProfile(data as StudentProfile);
      } catch {
        if (active) {
          setError(
            "Ocorreu um erro ao carregar o perfil."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const avatarUrl = profile?.avatar_url
    ? db().storage
        .from("avatars")
        .getPublicUrl(profile.avatar_url)
        .data.publicUrl
    : null;

  const github = safeExternalUrl(
    profile?.github_url || null,
    "github.com"
  );

  const linkedin = safeExternalUrl(
    profile?.linkedin_url || null,
    "linkedin.com"
  );

  return (
    <Guard>
      <main className="shell">
        <Nav />

        {loading ? (
          <section className="card">
            <p className="muted">
              A carregar o teu perfil...
            </p>
          </section>
        ) : error ? (
          <section className="card">
            <p className="error" role="alert">
              {error}
            </p>
          </section>
        ) : profile ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ marginBottom: 6 }}>
                Meu perfil
              </h1>

              <p className="muted">
                Apresenta-te à comunidade universitária.
              </p>
            </div>

            <section
              className="card"
              style={{
                maxWidth: 950,
                marginInline: "auto",
                padding: 0,
                overflow: "hidden",
              }}
            >
              {/* Capa */}
              <div
                className="profile-cover"
                style={{ borderRadius: 0 }}
              />

              <div
                style={{
                  padding: "0 24px 28px",
                }}
              >
                {/* Fotografia e edição */}
                <div
                  className="profile-header"
                  style={{
                    marginTop: -44,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      padding: 4,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                    }}
                  >
                    <ProfilePhotoViewer
                      name={profile.full_name}
                      avatarUrl={avatarUrl}
                      profileHref="/perfil"
                      size={88}
                    />
                  </div>

                  <Link
                    href="/perfil/editar"
                    className="btn"
                    style={{ marginTop: 52 }}
                  >
                    Editar perfil
                  </Link>
                </div>

                {/* Dados principais */}
                <div style={{ marginTop: 16 }}>
                  <h2 style={{ marginBottom: 4 }}>
                    {profile.full_name}
                  </h2>

                  <p
                    className="muted"
                    style={{ margin: "4px 0" }}
                  >
                    {profile.course ||
                      "Curso não informado"}
                    {" · "}
                    {profile.study_year
                      ? `${profile.study_year}.º ano`
                      : "Ano não informado"}
                  </p>

                  <p className="muted">
                    Universidade Pedagógica de Maputo
                  </p>
                </div>

                {/* Biografia */}
                <div className="profile-section">
                  <h3>Sobre mim</h3>

                  <p
                    className="muted"
                    style={{
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {profile.bio ||
                      "Ainda não adicionaste uma apresentação pessoal."}
                  </p>
                </div>

                {/* Competências */}
                <div className="profile-section">
                  <h3>Competências</h3>

                  {profile.skills?.length ? (
                    <div className="profile-tags">
                      {profile.skills.map(
                        (skill, index) => (
                          <span
                            key={`${skill}-${index}`}
                            className="profile-tag"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="muted">
                      Ainda não adicionaste competências.
                    </p>
                  )}
                </div>

                {/* Interesses */}
                <div className="profile-section">
                  <h3>Interesses</h3>

                  {profile.interests?.length ? (
                    <div className="profile-tags">
                      {profile.interests.map(
                        (interest, index) => (
                          <span
                            key={`${interest}-${index}`}
                            className="profile-tag"
                          >
                            {interest}
                          </span>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="muted">
                      Ainda não adicionaste interesses.
                    </p>
                  )}
                </div>

                {/* Ligações profissionais */}
                <div className="profile-section">
                  <h3>Portefólio profissional</h3>

                  {github || linkedin ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      {github && (
                        <a
                          href={github}
                          className="btn2"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          GitHub ↗
                        </a>
                      )}

                      {linkedin && (
                        <a
                          href={linkedin}
                          className="btn2"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          LinkedIn ↗
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="muted">
                      Ainda não adicionaste ligações
                      profissionais.
                    </p>
                  )}
                </div>

                {/* Projectos futuros */}
                <div className="profile-section">
                  <h3>Projectos</h3>

                  <p className="muted">
                    Os teus projectos académicos e
                    profissionais serão apresentados
                    aqui quando o módulo de projectos
                    estiver disponível.
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="card">
            <p className="muted">
              Perfil não encontrado.
            </p>
          </section>
        )}
      </main>
    </Guard>
  );
}
