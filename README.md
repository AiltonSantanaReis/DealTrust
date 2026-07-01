# DealTrust

DealTrust é uma plataforma de inteligência de compras, histórico de preços e alertas. O objetivo do produto é apoiar decisões de compra com dados verificáveis, rastreabilidade operacional e critérios consistentes de qualidade de oferta.

## Status do Projeto

O projeto está em fase de fundação técnica e MVP inicial. A base atual ainda não deve ser considerada pronta para produção.

Recursos implementados:

- Monorepo TypeScript com `pnpm workspaces`.
- Backend NestJS com adaptador Fastify em `apps/api`.
- Contratos compartilhados com Zod em `packages/contracts`.
- Regras de domínio isoladas em `packages/core`.
- Schema PostgreSQL e migrations com Drizzle em `packages/db`.
- Health check da API.
- Cadastro, login e endpoint autenticado `GET /auth/me`.
- Hash de senha com Argon2id.
- Access token JWT HS256 com segredo obrigatório em produção.
- RBAC simples para `user`, `admin` e `owner`.
- CRUD administrativo inicial de categorias, marcas e produtos.
- Testes unitários, contratos compartilhados e testes e2e com PostgreSQL real.
- CI com lint, typecheck, testes, build e smoke test da API compilada.

Pendências antes de produção:

- Verificação de e-mail.
- Refresh token, rotação e revogação de sessão.
- Rate limit em autenticação e endpoints públicos sensíveis.
- CRUD administrativo de variações, lojas, ofertas e snapshots.
- Auditoria administrativa.
- OpenAPI publicado.
- Logs estruturados, correlation id e observabilidade.

## Stack Técnica

| Camada | Escolha |
| --- | --- |
| Linguagem | TypeScript em modo estrito |
| Runtime | Node.js 24 LTS |
| Monorepo | pnpm workspaces |
| Backend | NestJS + Fastify |
| Validação | Zod |
| Banco transacional | PostgreSQL |
| ORM e migrations | Drizzle ORM |
| Cache e filas planejadas | Valkey + BullMQ |
| Testes | Vitest + testes e2e com PostgreSQL real |
| Qualidade | Biome, TypeScript e GitHub Actions |

## Estrutura

```text
apps/
  api/          API NestJS/Fastify
packages/
  core/         Regras de domínio puras e testáveis
  contracts/    Schemas, DTOs e tipos compartilhados
  db/           Schema, migrations e acesso ao PostgreSQL
docs/
  adr/          Decisões arquiteturais
```

## Requisitos Locais

- Node.js `>=24 <25`
- pnpm `>=11 <12`
- Git
- Docker Desktop ou Docker Engine

## Configuração

Instale as dependências:

```powershell
pnpm install
```

Crie o arquivo local de ambiente a partir de `.env.example` e ajuste os segredos conforme o ambiente.

Variáveis principais:

```env
DATABASE_URL=postgres://dealtrust:dealtrust@localhost:5432/dealtrust
TEST_DATABASE_URL=postgres://dealtrust:dealtrust@localhost:5433/dealtrust_test
DATABASE_MAX_CONNECTIONS=10
VALKEY_URL=redis://localhost:6379
AUTH_JWT_SECRET=change-me-to-a-random-secret-with-at-least-32-chars
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
```

Em `production`, `AUTH_JWT_SECRET` é obrigatório e deve ser um segredo aleatório com pelo menos 32 caracteres.

## Ambiente Local

Suba os serviços de desenvolvimento:

```powershell
docker compose up -d postgres postgres-test valkey mailpit
```

Portas padrão:

- API: `3001`
- PostgreSQL de desenvolvimento: `5432`
- PostgreSQL de teste: `5433`
- Valkey: `6379`
- Mailpit SMTP: `1025`
- Mailpit UI: `8025`

## Comandos

Validação completa com PostgreSQL real:

```powershell
$env:TEST_DATABASE_URL='postgres://dealtrust:dealtrust@localhost:5433/dealtrust_test'
pnpm verify
```

Testes sem banco externo obrigatório:

```powershell
pnpm test:run
```

Sem `TEST_DATABASE_URL`, os testes de integração que dependem de banco são pulados de forma explícita.

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

## API Atual

Endpoints disponíveis:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /admin/categories`
- `POST /admin/categories`
- `GET /admin/categories/:id`
- `PATCH /admin/categories/:id`
- `DELETE /admin/categories/:id`
- `GET /admin/brands`
- `POST /admin/brands`
- `GET /admin/brands/:id`
- `PATCH /admin/brands/:id`
- `DELETE /admin/brands/:id`
- `GET /admin/products`
- `POST /admin/products`
- `GET /admin/products/:id`
- `PATCH /admin/products/:id`
- `DELETE /admin/products/:id`

Exemplo de cadastro:

```json
{
  "name": "Usuário Exemplo",
  "email": "usuario@example.com",
  "password": "SenhaExemploSegura123!"
}
```

Resposta de autenticação:

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 900,
  "user": {
    "id": "<uuid>",
    "name": "Usuário Exemplo",
    "email": "usuario@example.com",
    "role": "user"
  }
}
```

Observações operacionais:

- `DELETE /admin/categories/:id` e `DELETE /admin/products/:id` arquivam o registro.
- `DELETE /admin/brands/:id` remove a marca quando ela não está vinculada a produtos.
- Endpoints administrativos exigem token válido e role `admin` ou `owner`.

## Qualidade e Validação

O projeto deve falhar de forma explícita quando contrato, banco, build ou teste estiver incorreto. Erros não devem ser mascarados durante desenvolvimento ou CI.

Cobertura atual de validação:

- Contratos Zod de autenticação, catálogo, ofertas, alertas, busca e dinheiro.
- Regras de domínio de preço, desconto suspeito e oportunidade.
- Schema Drizzle e migrations aplicadas em PostgreSQL real.
- Health check e autenticação pela pilha real Nest/Fastify.
- Respostas HTTP esperadas para payload inválido, token ausente, credencial inválida e permissão insuficiente.
- CRUD administrativo de categorias, marcas e produtos validado com PostgreSQL real.
- Hash de senha validado com Argon2id.
- JWT validado com issuer, audience, subject e claims.

## Roadmap do MVP

Marco 0 - Fundação:

- Repositório, monorepo, Docker Compose, CI, documentação, schema e testes base. Implementado.

Marco 1 - Backend base e admin mínimo:

- Auth com e-mail e senha. Base implementada.
- RBAC simples: `user`, `admin`, `owner`. Base implementada.
- CRUD de categorias. Base implementada.
- CRUD de marcas. Base implementada.
- CRUD de produtos. Base implementada.
- CRUD de variações e lojas.
- CRUD de ofertas.
- Registro manual de snapshots de preço.
- Auditoria básica de ações administrativas.

Marco 2 - Produto público e histórico:

- Busca de produtos.
- Página de produto com preço atual, lojas e histórico.
- Gráficos de 7, 30, 90 e 180 dias.
- Indicadores de preço histórico, oportunidade, disponibilidade e confiabilidade da loja.

Marco 3 - Alertas e recorrência:

- Favoritos e listas.
- Alertas por preço alvo e queda percentual.
- Worker de verificação.
- Notificação por e-mail.

## Documentos Base

- [Visão do Produto](docs/00-visao-produto.md)
- [Stack e Arquitetura](docs/01-stack-arquitetura.md)
- [Roadmap do MVP](docs/02-roadmap-mvp.md)
- [Modelo de Dados Inicial](docs/03-modelo-dados-inicial.md)
- [Práticas de Engenharia](docs/04-praticas-engenharia.md)
- [ADR 0001 - Stack Inicial](docs/adr/0001-stack-inicial.md)
