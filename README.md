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
- CRUD administrativo de categorias, marcas, produtos, variações, lojas e ofertas.
- Registro manual de snapshots de preço.
- Auditoria administrativa transacional com antes/depois, contexto da requisição e filtros por entidade.
- Headers HTTP defensivos e rate limit global configurável.
- Busca pública de produtos ativos com menor oferta disponível.
- Detalhe público de produto com variações, ofertas ativas, histórico recente e análise de preço.
- Janelas de histórico de 7, 30, 90 e 180 dias para gráficos e indicadores.
- Cálculo de preço final de snapshots com frete, cupom e cashback confirmado.
- Favoritos e listas autenticados com isolamento por usuário.
- Alertas autenticados por preço alvo, queda percentual e menor histórico.
- Testes unitários, contratos compartilhados e testes e2e com PostgreSQL real.
- CI com lint, typecheck, testes, build e smoke test da API compilada.

Pendências antes de produção:

- Verificação de e-mail.
- Refresh token, rotação e revogação de sessão.
- Rate limit distribuído com Valkey para múltiplas instâncias.
- Política granular de rate limit para autenticação e endpoints públicos sensíveis.
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
API_BODY_LIMIT_BYTES=1048576
API_RATE_LIMIT_WINDOW_SECONDS=60
API_RATE_LIMIT_MAX_REQUESTS=300
API_CORS_ORIGINS=
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
- `GET /products`
- `GET /products/:id`
- `GET /alerts`
- `POST /alerts`
- `GET /alerts/:id`
- `PATCH /alerts/:id`
- `DELETE /alerts/:id`
- `GET /favorite-lists`
- `POST /favorite-lists`
- `GET /favorite-lists/:id`
- `PATCH /favorite-lists/:id`
- `DELETE /favorite-lists/:id`
- `POST /favorite-lists/:id/items`
- `DELETE /favorite-lists/:id/items/:productVariantId`
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
- `GET /admin/product-variants`
- `POST /admin/product-variants`
- `GET /admin/product-variants/:id`
- `PATCH /admin/product-variants/:id`
- `DELETE /admin/product-variants/:id`
- `GET /admin/stores`
- `POST /admin/stores`
- `GET /admin/stores/:id`
- `PATCH /admin/stores/:id`
- `DELETE /admin/stores/:id`
- `GET /admin/offers`
- `POST /admin/offers`
- `GET /admin/offers/:id`
- `PATCH /admin/offers/:id`
- `DELETE /admin/offers/:id`
- `GET /admin/price-snapshots`
- `POST /admin/price-snapshots`
- `GET /admin/price-snapshots/:id`
- `GET /admin/audit-logs`

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

- `DELETE /admin/categories/:id`, `DELETE /admin/products/:id`, `DELETE /admin/product-variants/:id` e `DELETE /admin/stores/:id` arquivam o registro.
- `DELETE /admin/brands/:id` remove a marca quando ela não está vinculada a produtos.
- `DELETE /admin/offers/:id` marca a oferta como expirada, preservando o histórico.
- Endpoints administrativos exigem token válido e role `admin` ou `owner`.
- `GET /admin/audit-logs` exige role `owner`.
- A auditoria administrativa registra antes/depois, campos alterados, ator, entidade e contexto HTTP sem armazenar segredos.
- O rate limit atual é uma proteção local por instância; a versão distribuída com Valkey permanece como requisito antes de produção.

## Qualidade e Validação

O projeto deve falhar de forma explícita quando contrato, banco, build ou teste estiver incorreto. Erros não devem ser mascarados durante desenvolvimento ou CI.

Cobertura atual de validação:

- Contratos Zod de autenticação, catálogo, ofertas, alertas, busca e dinheiro.
- Regras de domínio de preço, desconto inconsistente e oportunidade.
- Schema Drizzle e migrations aplicadas em PostgreSQL real.
- Health check e autenticação pela pilha real Nest/Fastify.
- Respostas HTTP esperadas para payload inválido, token ausente, credencial inválida e permissão insuficiente.
- CRUD administrativo de categorias, marcas, produtos, variações, lojas, ofertas e snapshots validado com PostgreSQL real.
- Auditoria administrativa validada em fluxo e2e com consulta por entidade.
- Headers defensivos e rate limit global validados pela pilha real Nest/Fastify.
- Busca, detalhe público, janelas de histórico e cálculo de preço final validados com PostgreSQL real.
- Alertas autenticados validados com PostgreSQL real e isolamento por usuário.
- Favoritos e listas validados com PostgreSQL real, ownership por usuário e bloqueio de variações inativas.
- Hash de senha validado com Argon2id.
- JWT validado com issuer, audience, subject e claims.

## Roadmap do MVP

Marco 0 - Fundação:

- Repositório, monorepo, Docker Compose, CI, documentação, schema e testes base. Implementado.

Marco 1 - Backend base e administração inicial:

- Auth com e-mail e senha. Base implementada.
- RBAC simples: `user`, `admin`, `owner`. Base implementada.
- CRUD de categorias. Base implementada.
- CRUD de marcas. Base implementada.
- CRUD de produtos. Base implementada.
- CRUD de variações e lojas. Base implementada.
- CRUD de ofertas. Base implementada.
- Registro manual de snapshots de preço. Base implementada.
- Auditoria administrativa completa e transacional. Base implementada.
- Headers defensivos e rate limit global. Base implementada.

Marco 2 - Produto público e histórico:

- Busca pública de produtos ativos. Base implementada.
- API de detalhe de produto com preço atual, lojas e histórico. Base implementada.
- Indicadores de preço histórico, oportunidade, disponibilidade e confiabilidade da loja. Base implementada.
- Dados para gráficos de 7, 30, 90 e 180 dias. Base implementada.
- Interface gráfica para histórico. Pendente.

Marco 3 - Alertas e recorrência:

- Favoritos e listas. Base implementada.
- Alertas por preço alvo e queda percentual. Base implementada.
- Alertas de menor histórico. Base implementada.
- Worker de verificação.
- Notificação por e-mail.

## Documentos Base

- [Visão do Produto](docs/00-visao-produto.md)
- [Stack e Arquitetura](docs/01-stack-arquitetura.md)
- [Roadmap do MVP](docs/02-roadmap-mvp.md)
- [Modelo de Dados Inicial](docs/03-modelo-dados-inicial.md)
- [Práticas de Engenharia](docs/04-praticas-engenharia.md)
- [ADR 0001 - Stack Inicial](docs/adr/0001-stack-inicial.md)
