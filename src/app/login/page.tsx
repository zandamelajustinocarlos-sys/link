
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const router = useRouter();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");

    try {
      const { error } =
        await db().auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setMsg(error.message);
        return;
      }

      router.replace("/");
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar sessão."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="shell"
      style={{ maxWidth: 500 }}
    >
      <div className="brand">
        link
        <span style={{ color: "#FF796F" }}>
          .
        </span>
      </div>

      <form className="card" onSubmit={submit}>
        <h1>Bem-vindo de volta.</h1>

        <label>
          Email
          <input
            className="field"
            type="email"
            required
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
            type="password"
            required
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />
        </label>

        <button
          className="btn"
          disabled={busy}
          type="submit"
        >
          {busy ? "A entrar..." : "Entrar"}
        </button>

        {msg && (
          <p className="error" role="alert">
            {msg}
          </p>
        )}

        <p>
          Não tens conta?{" "}
          <Link href="/cadastro">
            Criar conta
          </Link>
        </p>
<p>
<Link
  href="/recuperar-senha"
  className="link-forgot-password"
>
  Esqueceste-te da palavra-passe?
</Link>
</p>

      </form>
    </main>
  );
}
