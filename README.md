# DealTrust

DealTrust e uma plataforma de inteligencia de compras. O objetivo nao e apenas listar promocoes, mas ajudar o usuario a decidir se um preco esta realmente bom, se a loja e confiavel e se o momento de compra faz sentido.

Frase guia: ajudar o usuario a nao ser enganado e comprar no melhor momento.

## Decisao tecnica inicial

- Arquitetura: monolito modular, com dominios bem separados e pronto para extrair servicos quando houver volume real.
- Linguagem principal: TypeScript para backend, web, admin, contratos e futuro app mobile.
- Runtime alvo: Node.js 24 LTS em desenvolvimento e producao.
- Monorepo: pnpm workspaces, com Turborepo como acelerador de build quando os apps forem criados.
- Backend: NestJS com adaptador Fastify, REST primeiro e OpenAPI publicado.
- Frontend publico e PWA: Next.js App Router.
- Painel administrativo: Next.js separado do app publico para reduzir risco operacional.
- Mobile: Expo/React Native apos validacao do MVP web/PWA.
- Banco principal: PostgreSQL.
- Cache e filas iniciais: Valkey com BullMQ.
- Busca inicial: PostgreSQL full-text e trigramas; OpenSearch apenas quando a busca justificar o custo operacional.
- Historico analitico futuro: ClickHouse quando o volume de snapshots e consultas historicas ultrapassar o PostgreSQL particionado.

## Estrutura planejada

```text
apps/
  api/          Backend NestJS
  web/          App publico, PWA e landing
  admin/        Painel operacional
  mobile/       App Expo/React Native, depois da validacao
packages/
  contracts/    Schemas, DTOs e tipos compartilhados
  db/           Schema, migrations e acesso ao banco
  config/       Configuracoes compartilhadas
  ui/           Componentes compartilhados quando fizer sentido
infra/
  docker/       Infra local e auxiliares
docs/
  adr/          Decisoes arquiteturais
```

## Primeiro foco de produto

O MVP deve validar confianca e recorrencia:

1. Usuario consegue buscar produto e entender se o preco e bom.
2. Produto exibe historico claro e grafico funcional.
3. Alerta de preco funciona de ponta a ponta.
4. Admin consegue corrigir produto, loja, oferta e historico.
5. Sistema registra logs, falhas de coleta e metricas basicas.

## Documentos base

- [Visao do Produto](docs/00-visao-produto.md)
- [Stack e Arquitetura](docs/01-stack-arquitetura.md)
- [Roadmap do MVP](docs/02-roadmap-mvp.md)
- [Modelo de Dados Inicial](docs/03-modelo-dados-inicial.md)
- [Praticas de Engenharia](docs/04-praticas-engenharia.md)
- [ADR 0001 - Stack Inicial](docs/adr/0001-stack-inicial.md)

