"use client";

export default function ErrorPage({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="shell">
      <section className="card">
        <h1>Ocorreu um erro</h1>

        <p>
          Tenta novamente. Se persistir,
          consulta o terminal.
        </p>

        <button
          className="btn"
          onClick={reset}
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}