# Vore Next

Nova base da Vore em Next.js + Supabase, criada em paralelo ao legado.

## Objetivo

- Manter `vore_website_26` e `api` intactos
- Migrar a Vore por fases para Vercel + Supabase
- Reutilizar a logica funcional atual sem destruir o projeto existente

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Variaveis de ambiente

Copiar `.env.example` para `.env.local` e preencher:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Fases previstas

1. Base Next.js e integracao Supabase
2. Auth
3. Perfis e paginas publicas
4. Edit profile e media
5. Guardados, reviews e recomendacoes

## Schema inicial

O schema inicial do Supabase para `auth` + `profiles` esta em:

- `supabase/migrations/0001_initial_auth_profiles.sql`

Nesta fase ja ficam preparados:

- `public.users` sincronizado com `auth.users`
- `public.profiles`
- triggers de `updated_at`
- policies RLS base para leitura publica de perfis publicados

## Estrutura

- `src/app`: App Router
- `src/components`: componentes visuais
- `src/features`: modulos de dominio
- `src/lib`: clientes e utilitarios
- `src/types`: tipos partilhados
