# my-routes

Organizador de visitas para quem roda empresas presencialmente. A agenda do Google vira rota: eventos do dia → empresas da visita → endereços geocodificados → rota com ordem otimizada, pronta para executar no celular (inclusive offline).

Feito para uso pessoal (um técnico/fiscal, quase tudo no RJ). Detalhes de produto em [`PRODUCT.md`](PRODUCT.md) e do visual em [`DESIGN.md`](DESIGN.md).

## Funcionalidades

- **Empresas**: cadastro com status, grupos, e-mails vinculados e preenchimento automático pelo CNPJ (BrasilAPI). Filtros salvos, transferência entre listas e importação/exportação com o Notion.
- **Agenda**: leitura de uma ou mais contas do Google Calendar; os eventos casam pelo nome com qualquer empresa cadastrada. Os que não citam nenhuma aparecem em "Eventos sem empresa" (tela de rotas), onde viram cadastro com o formulário preenchido pelo evento ou são marcados como "não é visita".
- **Rotas**: rota por dia ou por janela de datas, ordem otimizada (OSRM), mapa (MapLibre + MapTiler), navegação até a parada (Google Maps/Waze), painel de execução do dia, resumo e desfazer. Check-in automático pelo GPS ao chegar na parada e trajeto do dia gravado no mapa.
- **Rota automática**: um cron diário sincroniza a agenda e gera a rota do dia sozinho.
- **Geocodificação**: Geoapify com Nominatim como reserva, respeitando limites; endereços não encontrados ficam marcados.
- **Uso das APIs**: o consumo das APIs com cota é acompanhado no app; área de admin restrita por e-mail.
- **Servidor MCP**: `/api/mcp` (Streamable HTTP) para agentes consultarem e ajustarem empresas e rotas. Entra com token pessoal gerado no perfil (Claude Code) ou com login OAuth e tela de consentimento (conector do claude.ai, registro dinâmico de cliente).
- **PWA** instalável, com a rota do dia disponível sem sinal (`/offline`).

Regra do projeto: **só serviços gratuitos**, nada que exija billing.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19, rodando com [Bun](https://bun.sh)
- Tailwind CSS 4 + componentes [ui-sdk](https://www.npmjs.com/package/@ui-sdk/react) com API do shadcn (`src/components/ui/*`)
- Prisma 7 + Postgres (schema em pasta: `prisma/schema/*.prisma`)
- Better Auth (login com Google)
- TanStack Query, nuqs, React Hook Form + Zod, FullCalendar, MapLibre GL
- Biome (lint/format) e `bun test` com happy-dom

> Esta versão do Next tem mudanças incompatíveis com versões antigas. Veja `AGENTS.md` e a documentação em `node_modules/next/dist/docs/`.

## Rodando localmente

```bash
bun install          # também roda prisma generate e copia o worker do MapLibre
bun run db:migrate   # aplica as migrations no banco do .env
bun run dev
```

### Variáveis de ambiente (`.env`)

| Variável                                                   | Para quê                                             |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`                                             | Conexão do Postgres (pooler)                         |
| `DIRECT_URL`                                               | Conexão direta, usada pelas migrations               |
| `NEXT_PUBLIC_APP_URL`                                      | URL pública do app (auth e callbacks)                |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                | Login e acesso ao Google Calendar                    |
| `ALLOWED_EMAILS`                                           | E-mails autorizados a entrar (separados por vírgula) |
| `ADMIN_EMAILS`                                             | E-mails com acesso à área de admin                   |
| `GEOAPIFY_API_KEY`                                         | Geocodificação                                       |
| `NEXT_PUBLIC_MAPTILER_KEY`                                 | Tiles do mapa                                        |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET`                | OAuth do Notion                                      |
| `NOTION_COMPANIES_DB_ID` / `NOTION_INSPECTION_TEMPLATE_ID` | Base de empresas e template de vistoria no Notion    |
| `CRON_SECRET`                                              | Protege `/api/cron/sync-routes`                      |
| `CRON_USER_EMAIL`                                          | Usuário que o cron sempre processa                   |

## Scripts

| Comando                                | O que faz                                                 |
| -------------------------------------- | --------------------------------------------------------- |
| `bun run dev` / `build` / `start`      | Desenvolvimento, build (com `prisma generate`) e produção |
| `bun run lint` / `lint:fix` / `format` | Biome                                                     |
| `bun test`                             | Testes                                                    |
| `bun run db:migrate`                   | Cria e aplica migration em dev                            |
| `bun run db:migrate:create`            | Só cria a migration                                       |
| `bun run db:diff`                      | SQL da diferença entre o banco e o schema                 |
| `bun run db:deploy` / `db:status`      | Aplica migrations pendentes / mostra o estado             |
| `bun run db:studio`                    | Prisma Studio                                             |
| `bun run db:seed`                      | Seed do banco                                             |

Scripts avulsos de migração e enriquecimento de dados ficam em `scripts/`.

## Estrutura

```
src/
  app/
    (app)/        telas autenticadas: início, empresas, agenda, rotas, perfil, admin
    api/          rotas de API (empresas, rotas, calendário, cnpj, cron, mcp, tokens, uso…)
    login/        login
    offline/      rota do dia sem conexão
  components/     telas e componentes; ui/ são os wrappers do ui-sdk
  hooks/          hooks do TanStack Query
  lib/            serviços (rotas, sync com a agenda, geocodificação, auth, MCP…)
prisma/
  schema/         um arquivo .prisma por domínio
  migrations/
```

## Deploy

Pensado para a Vercel. O `vercel.json` agenda o cron `GET /api/cron/sync-routes` todo dia às 09:00 UTC (06:00 em Brasília); configure `CRON_SECRET` no projeto para ele funcionar. Rode `bun run db:deploy` para aplicar as migrations no banco de produção.
