# apps/api

Backend NestJS planejado para os dominios:

- auth
- users
- products
- stores
- offers
- prices
- alerts
- notifications
- admin
- analytics

Primeiro objetivo: API REST com OpenAPI, autenticacao, CRUD administrativo e regras de historico de preco.

Comandos iniciais:

```bash
pnpm --filter @dealtrust/api dev
pnpm --filter @dealtrust/api test:run
pnpm --filter @dealtrust/api typecheck
pnpm --filter @dealtrust/api build
```

Endpoint inicial:

- `GET /health`
