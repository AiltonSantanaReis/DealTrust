# packages/db

Pacote planejado para schema, migrations e acesso ao PostgreSQL.

Preferencia inicial: Drizzle ORM com SQL explicito nos caminhos de maior volume, especialmente historico de precos e rankings.

Responsabilidades iniciais:

- Definir o schema relacional do MVP.
- Gerar migracoes versionadas com Drizzle Kit.
- Manter nomes de colunas e indices alinhados aos fluxos de produto.
- Usar centavos inteiros para todos os valores monetarios.

Comandos:

```bash
pnpm --filter @dealtrust/db db:generate
pnpm --filter @dealtrust/db typecheck
pnpm --filter @dealtrust/db test:run
pnpm --filter @dealtrust/db test:integration
```

Teste de integracao real:

```bash
docker compose up -d postgres-test
$env:TEST_DATABASE_URL="postgres://dealtrust:dealtrust@localhost:5433/dealtrust_test"
pnpm --filter @dealtrust/db test:integration
```

O teste de integracao apaga e recria o schema `public`; por isso ele exige que o nome do banco termine com `_test`.
