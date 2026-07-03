import Link from "next/link";
import { registerAction } from "@/features/auth/actions";

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="auth-kicker">Registo</p>
        <h1 className="auth-title">Criar conta para a nova Vore</h1>
        <p className="auth-copy">
          Vamos usar este fluxo como base da migracao. O teu utilizador fica no
          Supabase Auth e a tabela `public.users` e preenchida automaticamente.
        </p>

        {message ? <p className="auth-message">{message}</p> : null}

        <form action={registerAction} className="auth-form">
          <label className="field">
            <span>Nome</span>
            <input name="name" type="text" placeholder="Adriano" required />
          </label>

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" placeholder="adriano@email.com" required />
          </label>

          <label className="field">
            <span>Password</span>
            <input name="password" type="password" placeholder="Minimo 6 caracteres" required />
          </label>

          <label className="field">
            <span>Tipo de conta</span>
            <select name="accountType" defaultValue="professional">
              <option value="professional">Professional</option>
              <option value="common">Common</option>
            </select>
          </label>

          <button type="submit" className="primary-button">
            Criar conta
          </button>
        </form>

        <p className="auth-switch">
          Ja tens conta? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
