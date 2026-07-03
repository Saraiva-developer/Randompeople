import Link from "next/link";
import { loginAction } from "@/features/auth/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="auth-kicker">Entrar</p>
        <h1 className="auth-title">Liga a tua conta Vore</h1>
        <p className="auth-copy">
          Esta e a nova base da Vore em Next.js. O login ja passa pelo Supabase,
          para depois ligarmos perfis, media e recomendacoes.
        </p>

        {message ? <p className="auth-message">{message}</p> : null}

        <form action={loginAction} className="auth-form">
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" placeholder="adriano@email.com" required />
          </label>

          <label className="field">
            <span>Password</span>
            <input name="password" type="password" placeholder="Minimo 6 caracteres" required />
          </label>

          <button type="submit" className="primary-button">
            Entrar
          </button>
        </form>

        <p className="auth-switch">
          Ainda nao tens conta? <Link href="/register">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}
