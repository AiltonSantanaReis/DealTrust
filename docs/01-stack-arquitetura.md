# Stack e Arquitetura

## Principio central

Comecar simples, modular e observavel. O projeto deve escalar por separacao de dominios, qualidade de dados e filas bem definidas, nao por microservicos prematuros.

## Stack escolhida

| Camada | Escolha inicial | Motivo |
| --- | --- | --- |
| Monorepo | pnpm workspaces | Suporte nativo a multiplos projetos e dependencias locais. |
| Build orchestration | Turborepo, quando os apps existirem | Cache e execucao paralela para monorepos TypeScript. |
| Runtime | Node.js 24 LTS | Linha LTS recomendada para producao; Node 26 ainda e Current em 2026-06-30. |
| Backend | NestJS + Fastify | Modulos, injecao de dependencia, OpenAPI, filas, guards e estrutura corporativa. |
| API | REST + OpenAPI primeiro | Mais simples para mobile, web, admin e integracoes. GraphQL fica fora do MVP. |
| Web/PWA | Next.js App Router | Entrega rapida de produto publico, SEO, landing e experiencia instalavel. |
| Admin | Next.js separado | Superficie de risco e permissoes separadas do app publico. |
| Mobile | Expo/React Native depois da validacao | Mantem TypeScript end-to-end e permite Android/iOS com menor fragmentacao. |
| Banco transacional | PostgreSQL | Consistencia, relacoes, indices, transacoes e extensibilidade. |
| Acesso ao banco | Drizzle ORM + SQL explicito em hot paths | Tipagem e migrations sem esconder SQL em partes criticas. |
| Cache e filas | Valkey + BullMQ | Cache, rate limit, jobs e notificacoes sem adicionar broker extra no MVP. |
| Busca | PostgreSQL FTS + pg_trgm | Bom o bastante para MVP; OpenSearch entra quando busca virar gargalo real. |
| Observabilidade | OpenTelemetry + logs estruturados | Base pronta para Prometheus, Grafana e tracing sem amarrar fornecedor. |
| Testes | Vitest, Supertest e Playwright | Unidade, integracao de API e fluxo real de usuario/admin. |

## Por que nao Flutter agora

Flutter e uma escolha forte para apps mobile, mas DealTrust precisa validar produto, painel, contratos de API, regras de negocio, coleta e historico. Para o inicio, TypeScript end-to-end reduz custo cognitivo, aumenta compartilhamento de tipos e acelera desenvolvimento. Flutter continua sendo alternativa futura se a experiencia mobile exigir UI altamente customizada ou se a equipe tiver especializacao em Dart.

## Arquitetura inicial

```text
apps/api
  modules/
    auth/
    users/
    products/
    stores/
    offers/
    prices/
    alerts/
    notifications/
    admin/
    analytics/
  shared/
    config/
    database/
    events/
    observability/

apps/web
  app/
  features/
  components/

apps/admin
  app/
  features/
  components/

packages/contracts
  src/
    auth/
    products/
    offers/
    alerts/

packages/db
  src/
    schema/
    migrations/
```

## Evolucao de escala

Fase 1 - MVP:

- Um backend modular.
- PostgreSQL com indices corretos e particionamento planejado para `price_snapshots`.
- Valkey para cache, rate limit e filas de jobs.
- Coleta manual/admin ou fontes autorizadas simples.

Fase 2 - Tracao:

- Workers separados para coleta, matching e notificacoes.
- Outbox pattern para eventos importantes.
- Read models para ranking e radar diario.
- OpenTelemetry enviando metricas e traces para stack self-hosted.

Fase 3 - Alto volume:

- OpenSearch para busca e autocomplete.
- ClickHouse para historico analitico e agregacoes pesadas.
- Separacao fisica de workers de ingestao.
- Event streaming dedicado se BullMQ/Valkey deixar de ser suficiente.

## Fontes oficiais consultadas

- Node.js releases: https://nodejs.org/en/about/previous-releases
- pnpm workspaces: https://pnpm.io/workspaces
- Turborepo docs: https://turborepo.dev/docs
- NestJS modules: https://docs.nestjs.com/modules
- Next.js docs: https://nextjs.org/docs
- Expo docs: https://docs.expo.dev/get-started/introduction/
- PostgreSQL docs: https://www.postgresql.org/docs/current/intro-whatis.html
- Valkey docs: https://valkey.io/topics/
- OpenSearch docs: https://docs.opensearch.org/latest/
- ClickHouse docs: https://clickhouse.com/docs/intro

