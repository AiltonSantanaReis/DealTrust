# ADR 0001 - Stack Inicial

Status: aceita

Data: 2026-06-30

## Contexto

DealTrust comeca do zero, mas os documentos do produto indicam escopo ambicioso: historico de precos, alertas, ranking de ofertas reais, reputacao de lojas, painel administrativo, coleta de dados, analytics e possibilidade de milhoes de usuarios.

O risco principal e tentar nascer como plataforma distribuida antes de validar o produto. O outro risco e escolher tecnologias desconectadas que aumentem custo de desenvolvimento para uma equipe pequena.

## Decisao

Adotar TypeScript end-to-end, com monorepo pnpm e backend NestJS em monolito modular.

Componentes:

- Node.js 24 LTS.
- pnpm workspaces.
- Turborepo quando houver multiplos apps com builds reais.
- NestJS + Fastify para API.
- Next.js App Router para web/PWA e admin.
- Expo/React Native para mobile apos validacao.
- PostgreSQL como banco transacional.
- Drizzle ORM com SQL explicito em consultas criticas.
- Valkey + BullMQ para cache e jobs no MVP.
- OpenTelemetry para instrumentacao.
- OpenSearch e ClickHouse apenas quando a escala justificar.

## Consequencias positivas

- Uma linguagem principal reduz friccao e acelera o MVP.
- Contratos podem ser compartilhados entre API, web, admin e mobile.
- Monolito modular preserva separacao de dominios sem custo operacional de microservicos.
- PostgreSQL resolve a maior parte do MVP com consistencia e indices corretos.
- Valkey permite cache, rate limit e filas sem broker adicional no primeiro ciclo.
- Evolucao para OpenSearch/ClickHouse fica planejada, mas nao obrigatoria.

## Consequencias negativas

- Expo/React Native pode nao atingir a mesma liberdade visual de Flutter em interfaces altamente customizadas.
- Monolito exige disciplina de limites entre modulos.
- PostgreSQL particionado exige cuidado em migrations e indices.
- Valkey/BullMQ pode precisar ser substituido por broker/event streaming se o volume de eventos crescer muito.

## Alternativas consideradas

### Flutter desde o inicio

Boa opcao para app mobile rico, mas aumenta fragmentacao de linguagem e nao resolve admin, backend, contratos e validacao web. Fica como alternativa futura.

### Microservicos desde o inicio

Tecnicamente possivel, mas adiciona custo operacional, rede, observabilidade, deploys e consistencia distribuida antes de existir tracao.

### Firebase/Supabase como backend principal

Bom para prototipos, mas DealTrust tem regras de negocio, historico, matching, auditoria e coleta que tendem a exigir backend proprio. Pode ser usado pontualmente, mas nao como nucleo da arquitetura.

