
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import Nav from "@/components/Nav";
import Guard from "@/components/Guard";
import PresenceStatus from "@/components/PresenceStatus";
import ProfilePhotoViewer from "@/components/ProfilePhotoViewer";
import { db } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  course: string | null;
  study_year: number | null;
};

type Conn = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

export default function Conexoes() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [connections, setConnections] =
    useState<Conn[]>([]);

  const [me, setMe] = useState("");
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(
    null
  );

  const load = useCallback(async (
    showLoading = false
  ) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const s = db();

      const {
        data: { user },
        error: authError,
      } = await s.auth.getUser();

      if (authError || !user) {
        setMsg("Sessão não encontrada.");
        return;
      }

      setMe(user.id);

      const [a, b] = await Promise.all([
        s
          .from("students")
          .select(
            "id,full_name,avatar_url,course,study_year"
          )
          .neq("id", user.id)
          .order("full_name", {
            ascending: true,
          }),

        s
          .from("connections")
          .select(
            "id,requester_id,addressee_id,status"
          )
          .or(
            `requester_id.eq.${user.id},addressee_id.eq.${user.id}`
          ),
      ]);

      if (a.error || b.error) {
        setMsg(
          a.error?.message ||
          b.error?.message ||
          "Erro ao carregar os dados."
        );
        return;
      }

      setStudents((a.data || []) as Student[]);
      setConnections((b.data || []) as Conn[]);
    } catch {
      setMsg("Erro ao carregar os estudantes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  async function request(id: string) {
    if (!me || busyId) return;

    setBusyId(id);
    setMsg("");

    try {
      const { error } = await db()
        .from("connections")
        .insert({
          requester_id: me,
          addressee_id: id,
        });

      if (error) {
        setMsg(error.message);
        return;
      }

      await load();
      setMsg("Pedido de conexão enviado.");
    } catch {
      setMsg("Não foi possível enviar o pedido.");
    } finally {
      setBusyId(null);
    }
  }

  async function accept(connectionId: string) {
    if (!me || busyId) return;

    setBusyId(connectionId);
    setMsg("");

    try {
      const { data, error } = await db()
        .from("connections")
        .update({
          status: "accepted",
        })
        .eq("id", connectionId)
        .eq("addressee_id", me)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (error) {
        setMsg(error.message);
        return;
      }

      if (!data) {
        setMsg(
          "Este pedido já não está pendente ou não pode ser aceite."
        );
        await load();
        return;
      }

      await load();
      setMsg("Conexão aceite com sucesso.");
    } catch {
      setMsg("Não foi possível aceitar a conexão.");
    } finally {
      setBusyId(null);
    }
  }

  const search = q.trim().toLowerCase();

  const filtered = students.filter((student) =>
    [
      student.full_name,
      student.course || "",
      student.study_year?.toString() || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(search)
  );

  function getConnection(studentId: string) {
    return connections.find(
      (c) =>
        (c.requester_id === me &&
          c.addressee_id === studentId) ||
        (c.addressee_id === me &&
          c.requester_id === studentId)
    );
  }

  function getAvatarUrl(path: string | null) {
    if (!path) return null;

    return db().storage
      .from("avatars")
      .getPublicUrl(path)
      .data.publicUrl;
  }

  return (
    <Guard>
      <main className="shell">
        <Nav />

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ marginBottom: 6 }}>
            Explorar estudantes
          </h1>

          <p className="muted">
            Descobre estudantes da Universidade
            Pedagógica de Maputo, conhece os seus
            perfis e cria novas conexões.
          </p>
        </div>

        <div
          className="card"
          style={{
            marginBottom: 20,
          }}
        >
          <label
            htmlFor="student-search"
            style={{
              display: "block",
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Pesquisar estudantes
          </label>

          <input
            id="student-search"
            className="field"
            type="search"
            placeholder="Nome, curso ou ano de frequência..."
            value={q}
            onChange={(e) =>
              setQ(e.target.value)
            }
          />

          <p
            className="muted"
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontSize: 13,
            }}
          >
            {loading
              ? "A carregar estudantes..."
              : `${filtered.length} estudante${
                  filtered.length === 1 ? "" : "s"
                } encontrado${
                  filtered.length === 1 ? "" : "s"
                }`}
          </p>
        </div>

        {msg && (
          <p
            role="status"
            className="card"
            style={{ marginBottom: 18 }}
          >
            {msg}
          </p>
        )}

        <section className="card">
          {loading ? (
            <p className="muted">
              A carregar estudantes e conexões...
            </p>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 12px",
              }}
            >
              <p
                style={{
                  fontSize: 34,
                  marginBottom: 12,
                }}
              >
                🔎
              </p>

              <h3>Nenhum estudante encontrado</h3>

              <p className="muted">
                Experimenta pesquisar por outro
                nome, curso ou ano de frequência.
              </p>
            </div>
          ) : (
            filtered.map((student) => {
              const connection =
                getConnection(student.id);

              const avatarUrl =
                getAvatarUrl(student.avatar_url);

              const isBusy =
                busyId !== null;

              return (
                <div
                  key={student.id}
                  className="item"
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                    paddingBlock: 16,
                  }}
                >
                  {/* Fotografia e dados */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flex: "1 1 260px",
                      minWidth: 0,
                    }}
                  >
                    <ProfilePhotoViewer
                      name={student.full_name}
                      avatarUrl={avatarUrl}
                      profileHref={
                        `/estudantes/${student.id}`
                      }
                      size={56}
                    />

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <Link
                        href={`/estudantes/${student.id}`}
                        style={{
                          display: "inline-block",
                          fontWeight: 700,
                          fontSize: 16,
                          color: "#1E293B",
                          textDecoration: "none",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {student.full_name}
                      </Link>

                      <div style={{ marginTop: 4 }}>
                        <PresenceStatus
                          studentId={student.id}
                        />
                      </div>

                      <div
                        className="muted"
                        style={{
                          fontSize: 13,
                          marginTop: 5,
                        }}
                      >
                        {student.course ||
                          "Curso não informado"}

                        {" · "}

                        {student.study_year
                          ? `${student.study_year}.º ano`
                          : "Ano não informado"}
                      </div>
                    </div>
                  </div>

                  {/* Estado da conexão */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {!connection ? (
                      <button
                        type="button"
                        className="btn2"
                        disabled={isBusy || !me}
                        onClick={() =>
                          request(student.id)
                        }
                      >
                        {busyId === student.id
                          ? "A enviar..."
                          : "Conectar"}
                      </button>
                    ) : connection.status ===
                      "accepted" ? (
                      <span className="ok">
                        Conectados
                      </span>
                    ) : connection.status ===
                        "pending" &&
                      connection.addressee_id ===
                        me ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={isBusy}
                        onClick={() =>
                          accept(connection.id)
                        }
                      >
                        {busyId === connection.id
                          ? "A aceitar..."
                          : "Aceitar"}
                      </button>
                    ) : connection.status ===
                      "pending" ? (
                      <span className="muted">
                        Pedido pendente
                      </span>
                    ) : (
                      <span className="muted">
                        {connection.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </Guard>
  );
}
