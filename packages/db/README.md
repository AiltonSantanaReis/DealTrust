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
```
