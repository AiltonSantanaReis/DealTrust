# DealTrust

DealTrust e uma plataforma de inteligencia de compras, historico de precos e alertas confiaveis. O objetivo nao e apenas listar promocoes: o produto deve ajudar o usuario a decidir se um preco esta realmente bom, se a loja e confiavel e se vale comprar agora ou esperar.

Frase guia: ajudar o usuario a nao ser enganado e comprar no melhor momento.

## Status atual

Projeto em fundacao tecnica e MVP inicial. Ainda nao esta pronto para producao.

Ja implementado:

- Monorepo TypeScript com `pnpm workspaces`.
- Backend NestJS + Fastify em `apps/api`.
- Contratos compartilhados com Zod em `packages/contracts`.
- Regras puras de precificacao em `packages/core`.
- Schema PostgreSQL inicial com Drizzle em `packages/db`.
- Migrations versionadas e teste de integracao contra PostgreSQL real.
- Health check da API.
- Auth inicial com cadastro e login por e-mail/senha.
- Senhas com Argon2id.
- Access token JWT HS256 com segredo obrigatorio em producao.
- CI com lint, typecheck, testes, build e smoke test da API compilada.

Ainda pendente antes de producao:

- Verificacao de e-mail.
- Refresh token, rotacao e revogacao de sessao.
- Guards de RBAC para `user`, `admin` e `owner`.
- Rate limit em auth e endpoints publicos.
- CRUD administrativo de catalogo, lojas, ofertas e snapshots.
- OpenAPI publicado.
- Logs estruturados, correlation id e observabilidade.

## Stack

| Camada | Escolha |
| --- | --- |
| Linguagem | TypeScript estrito |
| Runtime | Node.js 24 LTS |
| Monorepo | pnpm workspaces |
| Backend | NestJS + Fastify |
| Validacao | Zod |
| Banco | PostgreSQL |
| ORM/migrations | Drizzle ORM |
| Cache/filas planejadas | Valkey + BullMQ |
| Testes | Vitest + testes e2e com PostgreSQL real |
| Qualidade | Biome, TypeScript, CI GitHub Actions |

## Estrutura

```text
apps/
  api/          API NestJS/Fastify
packages/
  core/         Regras de dominio puras e testaveis
  contracts/    Schemas, DTOs e tipos compartilhados
  db/           Schema, migrations e acesso ao PostgreSQL
docs/
  adr/          Decisoes arquiteturais
```

## Requisitos locais

- Node.js `>=24 <25`
- pnpm `>=11 <12`
- Git
- Docker Desktop ou Docker Engine

## Configuracao

Instale as dependencias:

```powershell
pnpm install
```

Crie o arquivo local de ambiente a partir de `.env.example` e ajuste os segredos quando necessario.

Variaveis principais:

```env
DATABASE_URL=postgres://dealtrust:dealtrust@localhost:5432/dealtrust
TEST_DATABASE_URL=postgres://dealtrust:dealtrust@localhost:5433/dealtrust_test
DATABASE_MAX_CONNECTIONS=10
VALKEY_URL=redis://localhost:6379
AUTH_JWT_SECRET=change-me-to-a-random-secret-with-at-least-32-chars
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
```

Em `production`, `AUTH_JWT_SECRET` e obrigatorio e deve ser um segredo aleatorio com pelo menos 32 caracteres.

## Ambiente local

Suba os servicos:

```powershell
docker compose up -d postgres postgres-test valkey mailpit
```

Portas padrao:

- API: `3001`
- PostgreSQL dev: `5432`
- PostgreSQL test: `5433`
- Valkey: `6379`
- Mailpit SMTP: `1025`
- Mailpit UI: `8025`

## Comandos

Validacao completa com PostgreSQL real:

```powershell
$env:TEST_DATABASE_URL='postgres://dealtrust:dealtrust@localhost:5433/dealtrust_test'
pnpm verify
```

Testes sem banco externo obrigatorio:

```powershell
pnpm test:run
```

Sem `TEST_DATABASE_URL`, os testes de integracao que dependem de banco sao pulados de forma explicita.

Testes apenas da API com PostgreSQL real:

```powershell
$env:TEST_DATABASE_URL='postgres://dealtrust:dealtrust@localhost:5433/dealtrust_test'
pnpm --filter @dealtrust/api test:run
```

Checar migrations:

```powershell
pnpm --filter @dealtrust/db db:check
```

Build:

```powershell
pnpm build
```

API em desenvolvimento:

```powershell
pnpm --filter @dealtrust/api dev
```

## API atual

Endpoints disponiveis:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`

Exemplo de cadastro:

```json
{
  "name": "Ailton Reis",
  "email": "ailton@example.com",
  "password": "correct-horse-battery-123"
}
```

Resposta de auth:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 900,
  "user": {
    "id": "<uuid>",
    "name": "Ailton Reis",
    "email": "ailton@example.com",
    "role": "user"
  }
}
```

## Qualidade e testes

O projeto deve falhar de forma visivel quando algo estiver incorreto. A regra e nao mascarar erro de teste, banco, build ou contrato.

Cobertura atual de validacao:

- Contratos Zod de auth, ofertas, alertas, busca e dinheiro.
- Regras de dominio de preco, desconto suspeito e oportunidade.
- Schema Drizzle.
- Migrations aplicadas em PostgreSQL real.
- Health check e auth pela pilha real Nest/Fastify.
- Cadastro duplicado retornando `409`.
- Login invalido retornando `401`.
- Hash de senha validado com Argon2id.
- JWT validado com issuer, audience, subject e claims.

## Roadmap do MVP

Marco 0 - Fundacao:

- Repositorio, monorepo, Docker Compose, CI, docs, schema e testes base.

Marco 1 - Backend base e admin minimo:

- Auth com e-mail e senha. Em andamento.
- RBAC simples: `user`, `admin`, `owner`.
- CRUD de categorias, marcas, produtos, variacoes e lojas.
- CRUD de ofertas.
- Registro manual de snapshots de preco.
- Auditoria basica de acoes administrativas.

Marco 2 - Produto publico e historico:

- Busca de produtos.
- Pagina de produto com preco atual, lojas e historico.
- Graficos de 7, 30, 90 e 180 dias.
- Selos de menor preco historico, boa oportunidade e loja suspeita.

Marco 3 - Alertas e recorrencia:

- Favoritos e listas.
- Alertas por preco alvo e queda percentual.
- Worker de verificacao.
- Notificacao por e-mail.

## Documentos base

- [Visao do Produto](docs/00-visao-produto.md)
- [Stack e Arquitetura](docs/01-stack-arquitetura.md)
- [Roadmap do MVP](docs/02-roadmap-mvp.md)
- [Modelo de Dados Inicial](docs/03-modelo-dados-inicial.md)
- [Praticas de Engenharia](docs/04-praticas-engenharia.md)
- [ADR 0001 - Stack Inicial](docs/adr/0001-stack-inicial.md)
