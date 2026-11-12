
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { db } from "@/lib/supabase";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const redirectTo =
        `${window.location.origin}/recuperar-senha/confirmar`;

      const { error: resetError } =
        await db().auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo }
        );

      if (resetError) throw resetError;

      setMessage(
        "Se existir uma conta associada a este e-mail, " +
        "receberás uma ligação para recuperar a palavra-passe."
      );
    } catch {
      setError(
        "Não foi possível processar o pedido. " +
        "Tenta novamente dentro de alguns instantes."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="link-auth-screen">
      <section className="link-auth-card">
        <Link href="/" className="link-auth-brand">
          link<span>.</span>
        </Link>

        <h1>Recuperar palavra-passe</h1>

        <p className="link-auth-description">
          Introduz o e-mail associado à tua conta.
          Enviaremos uma ligação para definires
          uma nova palavra-passe.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="recovery-email">
            E-mail
          </label>

          <input
            id="recovery-email"
            className="field"
            type="email"
            autoComplete="email"
            placeholder="O teu e-mail"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
            disabled={loading}
          />

          {error && (
            <p className="link-auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="link-auth-success" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="btn link-auth-submit"
            disabled={loading}
          >
            {loading
              ? "A enviar..."
              : "Enviar ligação de recuperação"}
          </button>
        </form>

        <Link
          href="/login"
          className="link-auth-back"
        >
          Voltar ao login
        </Link>
      </section>
    </main>
  );
}
