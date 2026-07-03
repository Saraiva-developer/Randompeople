# Migration Notes

## Objetivo

Traduzir a estrutura atual em PHP/MySQL para uma base consistente em Next.js + Supabase, sem apagar o legado.

## Origem atual

O schema principal atual esta em `../api/schema.sql` e centra-se nestas areas:

- `users`
- `profiles`
- `saved_profiles`
- `password_resets`
- `recommendation_settings`
- `recommendation_permissions`
- `recommendations`
- `recommendation_reactions`

## Mapeamento inicial para Supabase

### Auth

- `users.email` e `users.password_hash`
  - passam para `auth.users`
- dados publicos do utilizador
  - passam para `public.users`

### Perfis

- `profiles`
  - mantem-se como `public.profiles`
- `data_json`
  - deve ser reduzido gradualmente
  - primeiro fica como `jsonb`
  - depois convertemos os campos principais para colunas reais

### Guardados

- `saved_profiles`
  - passa para `public.saved_profiles`
  - trocar `profile_ref` por `profile_id` quando a migracao estiver completa

### Recuperacao de password

- `password_resets`
  - deixa de ser necessario quando todo o auth estiver em Supabase Auth

### Recomendacoes

- `recommendation_settings`
- `recommendation_permissions`
- `recommendations`
- `recommendation_reactions`

Estas tabelas podem manter uma estrutura muito proxima da atual, com IDs `uuid` e politicas RLS.

## Buckets sugeridos

- `avatars`
- `profile-media`
- `profile-videos`

## Ordem da fase 2

1. Criar projeto Supabase
2. Definir schema inicial em Postgres
3. Ligar auth no Next.js
4. Migrar perfis publicos

## Plano 1:1 por abas

Estado em 2026-04-30:

| Aba | Estado Next | Falta para 1:1 |
| --- | --- | --- |
| Home | Parcial | Afinar cards/chips, metricas reais, recentes/guardados e ranking igual ao legado |
| Explorar | Parcial | Filtros avancados completos, paginacao/infinite scroll e estados ativos iguais ao legado |
| Notificacoes | Parcial funcional | Migrar recomendacoes/partilhas para Supabase, badge na nav e abertura de conteudo partilhado |
| Perfil | Parcial | Completar todos os tipos de item, modais, reviews, guardados, partilhas e detalhes visuais |
| Editar Perfil | Base ampliada | Migrar editor visual completo: abas customizadas, reorder, autosave, preview lateral, upload real e item cards ricos |
| Definicoes | Parcial funcional | Persistir preferencias em Supabase, credenciais completas, suporte/legal reais e idioma global |

Decisao de migracao:

1. Primeiro garantir todas as abas navegaveis e sem placeholders.
2. Depois aprofundar `Editar Perfil` porque alimenta `Perfil`, `Home` e `Explorar`.
3. So depois fechar interacoes transversais: guardados, reviews, recomendacoes, notificacoes e settings persistentes.

## Editor Next - fase incremental

Antes do editor visual 1:1, o Next deve conseguir guardar todos os blocos que o perfil publico ja sabe renderizar:

- dados base: nome, slug, tipo, categoria, localizacao, bio, avatar, cover
- redes e links principais
- galeria: fotos, videos e reels
- horario, agenda, parcerias e locais
- conteudo por tipo:
  - `service_pro`: servicos
  - `shop`: produtos e campanhas
  - `food`: menu
  - `lodging`: casas e quartos
  - `creator`: portfolio e servicos

Formato temporario dos blocos no formulario:

```txt
Nome | Preco | Descricao | Imagem URL
```

Este formato e intencionalmente simples para manter a app funcional enquanto o editor rico do legado e migrado por componentes.
