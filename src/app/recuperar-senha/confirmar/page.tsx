
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/supabase";

export default function ConfirmarRecuperacaoPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let recoveryConfirmed = false;

    const supabase = db();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY") {
        recoveryConfirmed = true;
        setAuthorized(true);
        setReady(true);
        setError("");
      }
    });

    async function validateRecovery() {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        if (params.get("error")) {
          throw new Error("Ligação inválida.");
        }

        const code = params.get("code");

        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (exchangeError) throw exchangeError;

          recoveryConfirmed = true;
        } else {
          const hash = new URLSearchParams(
            window.location.hash.slice(1)
          );

          if (hash.get("type") === "recovery") {
            const { data, error: sessionError } =
              await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            recoveryConfirmed = Boolean(
              data.session
            );
          }
        }

        if (!active) return;

        setAuthorized(recoveryConfirmed);

        if (!recoveryConfirmed) {
          setError(
            "A ligação de recuperação é inválida " +
            "ou expirou."
          );
        }
      } catch {
        if (active) {
          setAuthorized(false);
          setError(
            "Não foi possível validar a ligação. " +
            "Solicita uma nova recuperação."
          );
        }
      } finally {
        if (active) setReady(true);
      }
    }

    void validateRecovery();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!authorized || loading) return;

    setError("");

    if (password.length < 8) {
      setError(
        "A palavra-passe deve ter pelo menos " +
        "8 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "As palavras-passe não coincidem."
      );
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await db().auth.updateUser({
          password,
        });

      if (updateError) throw updateError;

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");

      await db().auth.signOut();
    } catch {
      setError(
        "Não foi possível actualizar a palavra-passe."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="link-auth-screen">
      <section className="link-auth-card">
        <Link
          href="/"
          className="link-auth-brand"
        >
          link<span>.</span>
        </Link>

        <h1>Nova palavra-passe</h1>

        {!ready ? (
          <p className="link-auth-description">
            A verificar a ligação...
          </p>
        ) : success ? (
          <>
            <p
              className="link-auth-success"
              role="status"
            >
              Palavra-passe actualizada com sucesso.
            </p>

            <Link
              href="/login"
              className="btn link-auth-submit"
            >
              Iniciar sessão
            </Link>
          </>
        ) : !authorized ? (
          <>
            <p
              className="link-auth-error"
              role="alert"
            >
              {error}
            </p>

            <Link
              href="/recuperar-senha"
              className="btn link-auth-submit"
            >
              Solicitar nova ligação
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="link-auth-description">
              Define a nova palavra-passe
              da tua conta link.
            </p>

            <label htmlFor="new-password">
              Nova palavra-passe
            </label>

            <input
              id="new-password"
              type="password"
              className="field"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

            <label htmlFor="confirm-password">
              Confirmar palavra-passe
            </label>

            <input
              id="confirm-password"
              type="password"
              className="field"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
            />

            {error && (
              <p
                className="link-auth-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn link-auth-submit"
              disabled={loading}
            >
              {loading
                ? "A actualizar..."
                : "Guardar nova palavra-passe"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
