export const migrationStats = [
  { value: "2 apps", label: "legado preservado: website + API PHP" },
  { value: "1 base", label: "nova app Next.js pronta para migracao" },
  { value: "6 fases", label: "plano gradual para Vercel + Supabase" }
];

export const stackChoices = [
  "Next.js App Router",
  "TypeScript",
  "Supabase Auth",
  "Supabase Postgres",
  "Supabase Storage",
  "Vercel"
];

export const migrationPlan = [
  {
    step: 1,
    title: "Base da plataforma",
    description:
      "Criar a nova app em paralelo ao legado, preparar estrutura, configs, layout inicial e camada de integracao com Supabase."
  },
  {
    step: 2,
    title: "Autenticacao",
    description:
      "Migrar registo, login, sessao e recuperacao de conta para Supabase Auth sem quebrar o fluxo atual."
  },
  {
    step: 3,
    title: "Perfis publicos",
    description:
      "Levar para a nova stack a leitura de perfis, slugs, explore e as paginas publicas que hoje dependem da API em PHP."
  },
  {
    step: 4,
    title: "Studio e edicao",
    description:
      "Recriar a edicao de perfil, publicacao, campos estruturados e preparacao para media mais robusta."
  },
  {
    step: 5,
    title: "Media, guardados e reviews",
    description:
      "Migrar imagens, videos, guardados e reviews para Supabase Database + Storage com politicas mais seguras."
  },
  {
    step: 6,
    title: "Recomendacoes e corte final",
    description:
      "Finalizar recomendacoes, reacoes, permissoes e so depois decidir quando o legado deixa de ser necessario."
  }
];
