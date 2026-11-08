
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Guard from "@/components/Guard";
import Nav from "@/components/Nav";
import ProfilePhotoViewer from "@/components/ProfilePhotoViewer";
import { db } from "@/lib/supabase";

type PublicProfile = {
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

export default function PublicStudentPage() {
  const params = useParams();
  const router = useRouter();

  const studentId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [profile, setProfile] =
    useState<PublicProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

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

        if (user.id === studentId) {
          router.replace("/perfil");
          return;
        }

        const { data, error: queryError } =
          await supabase
            .from("students")
            .select(
              "id,full_name,course,study_year,bio,avatar_url,skills,interests,github_url,linkedin_url"
            )
            .eq("id", studentId)
            .maybeSingle();

        if (!active) return;

        if (queryError) {
          setError(queryError.message);
          return;
        }

        if (!data) {
          setError("Estudante não encontrado.");
          return;
        }

        setProfile(data as PublicProfile);
      } catch {
        if (active) {
          setError("Erro ao carregar o perfil.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (studentId) {
      void load();
    } else {
      setError("Identificador inválido.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [studentId, router]);

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

        <Link
          href="/conexoes"
          className="muted"
          style={{ textDecoration: "none" }}
        >
          ← Voltar às conexões
        </Link>

        <h1 style={{ marginBottom: 20 }}>
          Perfil do estudante
        </h1>

        {loading ? (
          <section className="card">
            <p className="muted">
              A carregar perfil...
            </p>
          </section>
        ) : error ? (
          <section className="card">
            <p className="error" role="alert">
              {error}
            </p>
          </section>
        ) : profile ? (
          <section
            className="card"
            style={{
              maxWidth: 950,
              marginInline: "auto",
              padding: 0,
              overflow: "hidden",
            }}
          >
            <div
              className="profile-cover"
              style={{ borderRadius: 0 }}
            />

            <div style={{ padding: "0 24px 28px" }}>
              <div
                style={{
                  position: "relative",
                  marginTop: -44,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
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
                    profileHref={`/estudantes/${profile.id}`}
                    size={88}
                  />
                </div>

                <Link
                  href="/conexoes"
                  className="btn2"
                  style={{ marginTop: 45 }}
                >
                  Ver conexões
                </Link>
              </div>

              <h2 style={{ marginBottom: 4 }}>
                {profile.full_name}
              </h2>

              <p className="muted">
                {profile.course || "Curso não informado"}
                {" · "}
                {profile.study_year
                  ? `${profile.study_year}.º ano`
                  : "Ano não informado"}
              </p>

              <p className="muted">
                Universidade Pedagógica de Maputo
              </p>

              <div className="profile-section">
                <h3>Sobre mim</h3>
                <p className="muted">
                  {profile.bio ||
                    "Este estudante ainda não adicionou uma apresentação."}
                </p>
              </div>

              <div className="profile-section">
                <h3>Competências</h3>

                {profile.skills?.length ? (
                  <div className="profile-tags">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="profile-tag"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Nenhuma competência adicionada.
                  </p>
                )}
              </div>

              <div className="profile-section">
                <h3>Interesses</h3>

                {profile.interests?.length ? (
                  <div className="profile-tags">
                    {profile.interests.map(
                      (interest) => (
                        <span
                          key={interest}
                          className="profile-tag"
                        >
                          {interest}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <p className="muted">
                    Nenhum interesse adicionado.
                  </p>
                )}
              </div>

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
                    Sem ligações profissionais.
                  </p>
                )}
              </div>

              <div className="profile-section">
                <h3>Projectos</h3>
                <p className="muted">
                  Os projectos deste estudante
                  serão apresentados aqui quando
                  o módulo de projectos estiver
                  disponível.
                </p>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </Guard>
  );
}
