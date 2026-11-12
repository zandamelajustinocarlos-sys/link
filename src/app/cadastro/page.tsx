"use client";

import {
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { db } from "@/lib/supabase";

export default function Cadastro() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [course, setCourse] = useState("");
  const [studyYear, setStudyYear] = useState("1");

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!/^01\.\d{4}\.\d{4}$/.test(code)) {
      setMsg(
        "Código inválido: usa 01.XXXX.XXXX."
      );
      return;
    }

    if (
      course.trim().length < 2 ||
      course.trim().length > 120
    ) {
      setMsg("Introduz um curso válido.");
      return;
    }

    if (pass.length < 8 || pass !== confirm) {
      setMsg(
        "Confirma a palavra-passe (mínimo de 8 caracteres)."
      );
      return;
    }

    setBusy(true);

    try {
      const { error } = await db().auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: name.trim(),
            student_code: code,
            course: course.trim(),
            study_year: Number(studyYear),
          },

          emailRedirectTo:
            window.location.origin + "/login",
        },
      });

      if (error) throw error;

      setMsg(
        "Cadastro enviado! Confirma o email, se solicitado, e inicia sessão."
      );
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="shell"
      style={{ maxWidth: 510 }}
    >
      <div className="brand">
        link
        <span style={{ color: "#FF796F" }}>
          .
        </span>
      </div>

      <form
        className="card"
        onSubmit={submit}
      >
        <h1>Criar conta</h1>

        <p className="muted">
          Comunidade UP-Maputo 
        </p>

        <label>
          Nome completo

          <input
            className="field"
            required
            minLength={3}
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />
        </label>

        <label>
          Código de estudante

          <input
            className="field"
            required
            placeholder="01.1234.2025"
            value={code}
            onChange={(e) =>
              setCode(e.target.value)
            }
          />
        </label>

        <label>
          Curso

          <input
            className="field"
            required
            minLength={2}
            maxLength={120}
            placeholder="Ex.: Engenharia Informática"
            value={course}
            onChange={(e) =>
              setCourse(e.target.value)
            }
          />
        </label>

        <label>
          Ano de frequência

          <select
            className="field"
            required
            value={studyYear}
            onChange={(e) =>
              setStudyYear(e.target.value)
            }
          >
            {[1, 2, 3, 4, 5].map(
              (year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}.º ano
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Email

          <input
            className="field"
            required
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />
        </label>

        <label>
          Palavra-passe

          <input
            className="field"
            required
            type="password"
            minLength={8}
            value={pass}
            onChange={(e) =>
              setPass(e.target.value)
            }
          />
        </label>

        <label>
          Confirmar palavra-passe

          <input
            className="field"
            required
            type="password"
            value={confirm}
            onChange={(e) =>
              setConfirm(e.target.value)
            }
          />
        </label>

        <button
          className="btn"
          disabled={busy}
        >
          {busy
            ? "A criar..."
            : "Criar conta"}
        </button>

        {msg && (
          <p role="status">
            {msg}
          </p>
        )}

        <p>
          Já tens conta?{" "}
          <Link href="/login">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}