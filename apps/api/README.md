# apps/api

Backend NestJS planejado para os domínios:

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

Primeiro objetivo: API REST com OpenAPI, autenticação, CRUD administrativo, auditoria completa e regras de histórico de preço.

Comandos iniciais:

```bash
pnpm --filter @dealtrust/api dev
pnpm --filter @dealtrust/api test:run
pnpm --filter @dealtrust/api typecheck
pnpm --filter @dealtrust/api build
```

Principais endpoints atuais:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET|POST|PATCH|DELETE /admin/categories`
- `GET|POST|PATCH|DELETE /admin/brands`
- `GET|POST|PATCH|DELETE /admin/products`
- `GET|POST|PATCH|DELETE /admin/product-variants`
- `GET|POST|PATCH|DELETE /admin/stores`
- `GET|POST|PATCH|DELETE /admin/offers`
- `GET|POST /admin/price-snapshots`
- `GET /admin/audit-logs`
