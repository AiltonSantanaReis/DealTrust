# Roadmap do MVP

## Marco 0 - Fundação

Objetivo: deixar o projeto pronto para desenvolvimento sério.

- Repositório Git.
- Monorepo pnpm.
- Configuração de ambiente local.
- Docker Compose com PostgreSQL, Valkey e Mailpit.
- Padrões de lint, formatação, testes e commits.
- Documentação inicial de produto, arquitetura e modelo de dados.

## Marco 1 - Backend base e administração inicial

Objetivo: permitir cadastro e manutenção manual dos dados iniciais.

- Auth com e-mail e senha.
- RBAC simples: `user`, `admin`, `owner`.
- CRUD de categorias, marcas, produtos, variações e lojas.
- CRUD de ofertas.
- Registro manual de snapshots de preço.
- Auditoria administrativa completa, transacional e consultável por entidade.
- Headers HTTP defensivos e rate limit global configurável.

## Marco 2 - Produto público e histórico

Objetivo: apresentar evidências objetivas para apoiar a decisão de compra.

- Busca de produtos com filtros simples.
- API de detalhe de produto com preço atual, lojas e histórico.
- Indicadores: menor preço histórico, oportunidade relevante, disponibilidade e confiabilidade da loja.
- Dados para gráfico de 7, 30, 90 e 180 dias.
- Interface para visualização dos gráficos.
- Cálculo de preço final com frete, cupom e cashback confirmado quando existir.

## Marco 3 - Alertas e recorrência

Objetivo: validar retorno recorrente do usuário.

- Favoritos e listas. Base implementada.
- Alerta por preço alvo.
- Alerta por queda percentual.
- Alerta por menor preço histórico.
- Worker de verificação de alertas. Base implementada.
- Notificação por e-mail. Base implementada.
- Push web/mobile quando o app estiver pronto.

## Marco 4 - Radar de ofertas reais

Objetivo: criar hábito de consulta recorrente com critérios verificáveis.

- Ranking de ofertas por desconto verificado, confiabilidade, estoque, frete e recência.
- Tela de radar diário.
- Moderação de ofertas inconsistentes.
- Relatório interno de cliques e alertas disparados.

## Marco 5 - Coleta e matching

Objetivo: reduzir trabalho manual sem perder confiabilidade.

- Coleta por fontes autorizadas, feeds ou APIs antes de scraping.
- Importação CSV/admin para fontes iniciais.
- Pipeline de matching de anúncios para produto canônico.
- Revisão manual de casos de baixa confiança.
- Logs e alertas de falha de coleta.

## Critérios de pronto do MVP

- Usuário cadastra conta, busca produto e entende o histórico.
- Produto mostra menor preço, média e tendência.
- Alerta dispara corretamente quando a condição é atingida.
- Admin corrige loja, produto, oferta e snapshot.
- Logs e falhas principais aparecem para operação.
- Testes automatizados cobrem regras críticas.
