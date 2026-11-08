
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import Guard from "@/components/Guard";
import Nav from "@/components/Nav";
import ProfilePhotoEditor from "@/components/ProfilePhotoEditor";
import { db } from "@/lib/supabase";

type Profile = {
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

const emptyProfile: Profile = {
  full_name: "",
  course: null,
  study_year: null,
  bio: null,
  avatar_url: null,
  skills: [],
  interests: [],
  github_url: null,
  linkedin_url: null,
};

function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

function validUrl(value: string): boolean {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function EditarPerfilPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<Profile>(emptyProfile);

  const [skillsText, setSkillsText] = useState("");
  const [interestsText, setInterestsText] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loaded, setLoaded] = useState(false);

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
          setError("Sessão não encontrada.");
          return;
        }

        const { data, error: profileError } =
          await supabase
            .from("students")
            .select(
              "full_name,course,study_year,bio,avatar_url,skills,interests,github_url,linkedin_url"
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

        const student = data as Profile;

        setProfile(student);
        setSkillsText(
          (student.skills || []).join(", ")
        );
        setInterestsText(
          (student.interests || []).join(", ")
        );

        setLoaded(true);
      } catch {
        if (active) {
          setError("Erro ao carregar o perfil.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof Profile>(
    field: K,
    value: Profile[K]
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving || !loaded) return;

    setError("");
    setSuccess("");

    const skills = parseTags(skillsText);
    const interests = parseTags(interestsText);

    if (
      profile.full_name.trim().length < 2 ||
      profile.full_name.length > 120
    ) {
      setError("Introduz um nome válido.");
      return;
    }

    if (
      profile.study_year !== null &&
      (profile.study_year < 1 ||
        profile.study_year > 10)
    ) {
      setError("Ano de frequência inválido.");
      return;
    }

    if ((profile.bio || "").length > 500) {
      setError(
        "A biografia não pode ultrapassar 500 caracteres."
      );
      return;
    }

    if (
      skills.length > 20 ||
      interests.length > 20
    ) {
      setError(
        "Podes adicionar até 20 competências e 20 interesses."
      );
      return;
    }

    if (
      !validUrl(profile.github_url || "") ||
      !validUrl(profile.linkedin_url || "")
    ) {
      setError("Utiliza ligações HTTPS válidas.");
      return;
    }

    setSaving(true);

    try {
      const { error: saveError } = await db().rpc(
        "update_my_profile",
        {
          p_full_name: profile.full_name.trim(),
          p_course: profile.course?.trim() || null,
          p_study_year: profile.study_year,
          p_bio: profile.bio?.trim() || null,
          p_skills: skills,
          p_interests: interests,
          p_github_url:
            profile.github_url?.trim() || null,
          p_linkedin_url:
            profile.linkedin_url?.trim() || null,
        }
      );

      if (saveError) {
        setError(saveError.message);
        return;
      }

      setProfile((current) => ({
        ...current,
        full_name: current.full_name.trim(),
        skills,
        interests,
      }));

      setSuccess("Perfil actualizado com sucesso.");
      router.refresh();
    } catch {
      setError(
        "Não foi possível guardar as alterações."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Guard>
      <main className="shell">
        <Nav />

        <div style={{ marginBottom: 24 }}>
          <Link
            href="/perfil"
            className="muted"
            style={{ textDecoration: "none" }}
          >
            ← Voltar ao perfil
          </Link>

          <h1 style={{ marginBottom: 6 }}>
            Editar perfil
          </h1>

          <p className="muted">
            Actualiza a tua apresentação académica
            e profissional.
          </p>
        </div>

        {loading ? (
          <section className="card">
            <p className="muted">
              A carregar informações...
            </p>
          </section>
        ) : !loaded ? (
          <section className="card">
            <p className="error" role="alert">
              {error || "Perfil não encontrado."}
            </p>
          </section>
        ) : (
          <div
            className="card"
            style={{
              maxWidth: 850,
              marginInline: "auto",
            }}
          >
            <div
              className="profile-cover"
              style={{
                marginBottom: 24,
              }}
            />

            {/* Fotografia: guardada separadamente */}
            <ProfilePhotoEditor
              name={profile.full_name}
              initialPath={profile.avatar_url}
            />

            <form onSubmit={save}>
              <div className="profile-section">
                <h2>Informações académicas</h2>

                <label htmlFor="full_name">
                  Nome completo
                </label>

                <input
                  id="full_name"
                  className="field"
                  required
                  maxLength={120}
                  value={profile.full_name}
                  onChange={(e) =>
                    updateField(
                      "full_name",
                      e.target.value
                    )
                  }
                />

                <label htmlFor="course">
                  Curso
                </label>

                <input
                  id="course"
                  className="field"
                  maxLength={150}
                  placeholder="Ex.: Engenharia Informática"
                  value={profile.course || ""}
                  onChange={(e) =>
                    updateField(
                      "course",
                      e.target.value
                    )
                  }
                />

                <label htmlFor="study_year">
                  Ano de frequência
                </label>

                <select
                  id="study_year"
                  className="field"
                  value={profile.study_year ?? ""}
                  onChange={(e) =>
                    updateField(
                      "study_year",
                      e.target.value
                        ? Number(e.target.value)
                        : null
                    )
                  }
                >
                  <option value="">
                    Selecciona o ano
                  </option>

                  {Array.from(
                    { length: 10 },
                    (_, index) => index + 1
                  ).map((year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}.º ano
                    </option>
                  ))}
                </select>
              </div>

              <div className="profile-section">
                <h2>Sobre mim</h2>

                <label htmlFor="bio">
                  Apresentação pessoal
                </label>

                <textarea
                  id="bio"
                  className="field"
                  rows={5}
                  maxLength={500}
                  placeholder="Fala sobre os teus objectivos, experiências e interesses profissionais..."
                  value={profile.bio || ""}
                  onChange={(e) =>
                    updateField(
                      "bio",
                      e.target.value
                    )
                  }
                />

                <small className="muted">
                  {(profile.bio || "").length}/500
                  caracteres
                </small>
              </div>

              <div className="profile-section">
                <h2>Competências e interesses</h2>

                <label htmlFor="skills">
                  Competências
                </label>

                <input
                  id="skills"
                  className="field"
                  placeholder="JavaScript, Design, Marketing"
                  value={skillsText}
                  onChange={(e) => {
                    setSkillsText(e.target.value);
                    setSuccess("");
                  }}
                />

                <p className="muted">
                  Separa cada competência por vírgula.
                </p>

                <div className="profile-tags">
                  {parseTags(skillsText).map(
                    (skill) => (
                      <span
                        key={skill}
                        className="profile-tag"
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>

                <label
                  htmlFor="interests"
                  style={{
                    display: "block",
                    marginTop: 22,
                  }}
                >
                  Interesses
                </label>

                <input
                  id="interests"
                  className="field"
                  placeholder="Tecnologia, Networking, Empreendedorismo"
                  value={interestsText}
                  onChange={(e) => {
                    setInterestsText(e.target.value);
                    setSuccess("");
                  }}
                />

                <div className="profile-tags">
                  {parseTags(interestsText).map(
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
              </div>

              <div className="profile-section">
                <h2>Portefólio profissional</h2>

                <label htmlFor="github">
                  GitHub
                </label>

                <input
                  id="github"
                  className="field"
                  type="url"
                  maxLength={300}
                  placeholder="https://github.com/utilizador"
                  value={profile.github_url || ""}
                  onChange={(e) =>
                    updateField(
                      "github_url",
                      e.target.value
                    )
                  }
                />

                <label htmlFor="linkedin">
                  LinkedIn
                </label>

                <input
                  id="linkedin"
                  className="field"
                  type="url"
                  maxLength={300}
                  placeholder="https://www.linkedin.com/in/utilizador"
                  value={profile.linkedin_url || ""}
                  onChange={(e) =>
                    updateField(
                      "linkedin_url",
                      e.target.value
                    )
                  }
                />
              </div>

              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}

              {success && (
                <p className="ok" role="status">
                  {success}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 24,
                }}
              >
                <Link
                  href="/perfil"
                  className="btn2"
                >
                  Voltar ao perfil
                </Link>

                <button
                  type="submit"
                  className="btn"
                  disabled={saving}
                >
                  {saving
                    ? "A guardar..."
                    : "Guardar alterações"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </Guard>
  );
}
