# DealTrust

Backend-first shopping intelligence platform for product catalogs, price history, trusted offers, alerts, and data-driven purchase decisions.

DealTrust is designed as a modular TypeScript monorepo focused on clean backend architecture, data integrity, authentication, role-based access control, testability, and future scalability for a shopping intelligence product.

> Current status: technical foundation and early MVP. The project is not yet production-ready.

---

## Overview

Modern consumers often compare prices across multiple stores without knowing whether an offer is actually good, whether the store is reliable, or whether the price is historically meaningful.

DealTrust explores this problem by building the backend foundation for a platform that can:

- Organize products, brands, categories, stores, offers, and price snapshots.
- Track price history over time.
- Identify suspicious discounts and possible opportunities.
- Support user alerts for target prices and price drops.
- Provide administrative workflows for catalog quality.
- Keep business rules isolated, testable, and reusable.

The current implementation focuses on the core backend foundation: authentication, authorization, catalog administration, shared contracts, database schema, automated tests, and CI validation.

---

## Why This Project Exists

This project was created to practice and demonstrate production-oriented backend engineering through a real product idea instead of isolated code exercises.

The main engineering goals are:

- Build a maintainable TypeScript monorepo.
- Separate API, domain rules, contracts, and persistence.
- Use explicit validation at system boundaries.
- Apply authentication and authorization from the beginning.
- Validate behavior with automated tests and real database integration.
- Keep the architecture ready for future services such as workers, queues, notifications, and price snapshot ingestion.

---

## Tech Stack

| Area | Technology |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| Package manager | pnpm workspaces |
| Backend | NestJS + Fastify |
| Validation | Zod |
| Database | PostgreSQL |
| ORM / Migrations | Drizzle ORM |
| Authentication | Argon2id password hashing + JWT |
| Authorization | Role-based access control |
| Testing | Vitest + e2e tests with real PostgreSQL |
| Quality | Biome, TypeScript strict mode, GitHub Actions |
| Local infrastructure | Docker Compose |

---

## Repository Structure

```txt
apps/
  api/             # NestJS/Fastify API

packages/
  core/            # Pure domain rules and business logic
  contracts/       # Zod schemas, DTOs and shared types
  db/              # Drizzle schema, migrations and database access

docs/
  adr/             # Architecture decision records
```

This structure keeps the API from becoming a large monolithic layer. Domain logic, validation contracts, and database access are separated so they can evolve independently.

---

## Implemented Features

### Foundation

- TypeScript monorepo with pnpm workspaces.
- Backend API using NestJS with Fastify adapter.
- Shared contracts with Zod.
- Isolated domain rules in a dedicated core package.
- PostgreSQL schema and migrations with Drizzle ORM.
- Health check endpoint.
- GitHub Actions validation pipeline.

### Authentication and Authorization

- User registration.
- Login with e-mail and password.
- Authenticated `GET /auth/me` endpoint.
- Password hashing with Argon2id.
- JWT access tokens.
- Role-based access control with:
  - `user`
  - `admin`
  - `owner`

### Catalog Administration

Initial administrative CRUD for:

- Categories.
- Brands.
- Products.

Administrative endpoints require a valid token and an authorized role.

### Testing and Validation

- Unit tests for domain rules.
- Contract tests for shared schemas.
- e2e tests using a real PostgreSQL database.
- Validation for invalid payloads, missing tokens, invalid credentials and insufficient permissions.
- CI pipeline with lint, typecheck, tests, build and compiled API smoke test.

---

## API Surface

Current endpoints include:

```txt
GET    /health

POST   /auth/register
POST   /auth/login
GET    /auth/me

GET    /admin/categories
POST   /admin/categories
GET    /admin/categories/:id
PATCH  /admin/categories/:id
DELETE /admin/categories/:id

GET    /admin/brands
POST   /admin/brands
GET    /admin/brands/:id
PATCH  /admin/brands/:id
DELETE /admin/brands/:id

GET    /admin/products
POST   /admin/products
GET    /admin/products/:id
PATCH  /admin/products/:id
DELETE /admin/products/:id
```

---

## Example Authentication Payload

### Register

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "StrongExamplePassword123!"
}
```

### Authentication Response

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSeconds": 900,
  "user": {
    "id": "<uuid>",
    "name": "Example User",
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

## Local Requirements

- Node.js `>=24 <25`
- pnpm `>=11 <12`
- Git
- Docker Desktop or Docker Engine

---

## Environment Setup

Install dependencies:

```bash
pnpm install
```

Create a local environment file from `.env.example` and adjust the values for your machine.

Main environment variables:

```env
DATABASE_URL=postgres://dealtrust:dealtrust@localhost:5432/dealtrust
TEST_DATABASE_URL=postgres://dealtrust:dealtrust@localhost:5433/dealtrust_test
DATABASE_MAX_CONNECTIONS=10
VALKEY_URL=redis://localhost:6379
AUTH_JWT_SECRET=change-me-to-a-random-secret-with-at-least-32-chars
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
```

In production, `AUTH_JWT_SECRET` must be a random secret with at least 32 characters.

---

## Running Locally

Start local services:

```bash
docker compose up -d postgres postgres-test valkey mailpit
```

Default local ports:

| Service | Port |
|---|---:|
| API | `3001` |
| PostgreSQL development | `5432` |
| PostgreSQL test | `5433` |
| Valkey | `6379` |
| Mailpit SMTP | `1025` |
| Mailpit UI | `8025` |

Run the API in development mode:

```bash
pnpm --filter @dealtrust/api dev
```

---

## Quality Commands

Run tests without requiring an external database:

```bash
pnpm test:run
```

Run full validation with real PostgreSQL:

```bash
pnpm verify
```

Run API tests with real PostgreSQL:

```bash
pnpm --filter @dealtrust/api test:run
```

Check database migrations:

```bash
pnpm --filter @dealtrust/db db:check
```

Build all packages:

```bash
pnpm build
```

---

## Engineering Principles

DealTrust follows a few strict engineering principles:

- Fail explicitly when contracts, database access, tests or builds are incorrect.
- Keep domain rules pure whenever possible.
- Validate input at boundaries.
- Avoid hiding errors during CI.
- Prefer small packages with clear responsibilities.
- Treat authentication, authorization and data integrity as core requirements, not later additions.
- Keep the project honest about its current status.

---

## Roadmap

### Milestone 0 — Foundation

- Repository structure.
- Monorepo setup.
- Docker Compose.
- CI pipeline.
- Base documentation.
- Database schema.
- Initial automated tests.

Status: implemented.

### Milestone 1 — Backend Base and Admin

- E-mail/password authentication.
- Simple RBAC.
- Category CRUD.
- Brand CRUD.
- Product CRUD.
- Product variation CRUD.
- Store CRUD.
- Offer CRUD.
- Manual price snapshot registration.
- Basic administrative audit log.

Status: partially implemented.

### Milestone 2 — Product and Price History

- Product search.
- Product detail page data model.
- Current price by store.
- Historical price charts for 7, 30, 90 and 180 days.
- Historical price indicators.
- Store reliability signals.
- Opportunity detection.

Status: planned.

### Milestone 3 — Alerts and Automation

- Favorites and product lists.
- Target price alerts.
- Percentage drop alerts.
- Background worker for offer checks.
- E-mail notifications.

Status: planned.

---

## Before Production

The following items are intentionally pending before any production use:

- E-mail verification.
- Refresh tokens.
- Session rotation and revocation.
- Rate limiting for authentication and sensitive public endpoints.
- Administrative audit trail.
- OpenAPI documentation.
- Structured logs.
- Correlation IDs.
- Observability.
- Security review.
- Deployment hardening.

---

## What This Project Demonstrates

This repository demonstrates:

- Backend API design with TypeScript.
- Modular monorepo organization.
- Authentication and authorization fundamentals.
- Database modeling with PostgreSQL and Drizzle.
- Shared contracts with Zod.
- Automated testing discipline.
- Real database e2e testing.
- CI validation.
- Product-oriented backend architecture.

---

## Author

Ailton Santana Reis

Software Engineering student focused on backend engineering, product architecture, data-driven applications and reliable software systems.
