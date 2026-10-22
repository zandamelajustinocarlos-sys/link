"use client";

import {
  useEffect,
  useState,
} from "react";

import Nav from "@/components/Nav";
import Guard from "@/components/Guard";

import PresenceStatus from "@/components/PresenceStatus";
import { db } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string;
  student_code: string;
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

  async function load() {
    const s = db();

    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) return;

    setMe(user.id);

    const [a, b] = await Promise.all([
      s.from("students")
        .select(
          "id,full_name,student_code,course,study_year"
        )
        .neq("id", user.id),

      s.from("connections")
        .select("*"),
    ]);

    setStudents(a.data || []);
    setConnections(b.data || []);

    if (a.error || b.error) {
      setMsg(
        a.error?.message ||
        b.error?.message ||
        "Erro ao carregar os dados."
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function request(id: string) {
    const { error } = await db()
      .from("connections")
      .insert({
        requester_id: me,
        addressee_id: id,
      });

    setMsg(
      error?.message || "Pedido enviado."
    );

    await load();
  }

  async function accept(id: string) {
    const { error } = await db()
      .from("connections")
      .update({
        status: "accepted",
      })
      .eq("id", id);

    setMsg(
      error?.message || "Conexão aceite."
    );

    await load();
  }

  const filtered = students.filter(
    (student) =>
      `${student.full_name} ${student.student_code} ${student.course || ""} ${student.study_year || ""}`
        .toLowerCase()
        .includes(q.toLowerCase())
  );

  return (
    <Guard>
      <main className="shell">
        <Nav />

        <h1>Explorar estudantes</h1>

        <p className="muted">
          Encontra colegas por nome, curso ou ano de frequência.
        </p>

        <input
          className="field"
          placeholder="Pesquisar por nome, curso ou código"
          value={q}
          onChange={(e) =>
            setQ(e.target.value)
          }
        />

        {msg && (
          <p role="status">
            {msg}
          </p>
        )}

        <div className="card">
          {filtered.map((student) => {
            const connection =
              connections.find(
                (c) =>
                  c.requester_id === student.id ||
                  c.addressee_id === student.id
              );

            return (
              <div
                key={student.id}
                className="item"
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <strong>
                    {student.full_name}
                  </strong>

                  <div>
                    <PresenceStatus
                      studentId={student.id}
                    />
                  </div>

                  <div className="muted">
                    {student.course ||
                      "Curso não informado"}
                    {" · "}
                    {student.study_year
                      ? `${student.study_year}.º ano`
                      : "Ano não informado"}
                  </div>

                  <small className="muted">
                    {student.student_code}
                  </small>
                </div>

                {!connection ? (
                  <button
                    className="btn2"
                    onClick={() =>
                      request(student.id)
                    }
                  >
                    Conectar
                  </button>
                ) : connection.status ===
                  "accepted" ? (
                  <span className="ok">
                    Conectados
                  </span>
                ) : connection.addressee_id ===
                  me ? (
                  <button
                    className="btn"
                    onClick={() =>
                      accept(connection.id)
                    }
                  >
                    Aceitar
                  </button>
                ) : (
                  <span className="muted">
                    Pendente
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </Guard>
  );
}