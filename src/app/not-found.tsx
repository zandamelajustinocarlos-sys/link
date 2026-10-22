import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <div className="brand">link</div>

      <section className="card">
        <h1>Página não encontrada</h1>

        <p>Esta página não existe.</p>

        <Link href="/" className="btn">
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}