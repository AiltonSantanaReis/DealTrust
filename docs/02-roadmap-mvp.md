# Roadmap do MVP

## Marco 0 - Fundacao

Objetivo: deixar o projeto pronto para desenvolvimento serio.

- Repositorio Git.
- Monorepo pnpm.
- Configuracao de ambiente local.
- Docker Compose com PostgreSQL, Valkey e Mailpit.
- Padroes de lint, formatacao, testes e commits.
- Documentacao inicial de produto, arquitetura e modelo de dados.

## Marco 1 - Backend base e admin minimo

Objetivo: permitir cadastro e manutencao manual dos dados iniciais.

- Auth com e-mail e senha.
- RBAC simples: `user`, `admin`, `owner`.
- CRUD de categorias, marcas, produtos, variacoes e lojas.
- CRUD de ofertas.
- Registro manual de snapshots de preco.
- Auditoria basica de acoes administrativas.

## Marco 2 - Produto publico e historico

Objetivo: o usuario entende se o preco e bom.

- Busca de produtos com filtros simples.
- Pagina de produto com preco atual, lojas e historico.
- Grafico de 7, 30, 90 e 180 dias.
- Indicadores: menor preco historico, boa oportunidade, aguarde e confiabilidade da loja.
- Calculo de preco final com frete, cupom e cashback confirmado quando existir.

## Marco 3 - Alertas e recorrencia

Objetivo: validar retorno do usuario.

- Favoritos e listas.
- Alerta por preco alvo.
- Alerta por queda percentual.
- Worker de verificacao de alertas.
- Notificacao por e-mail.
- Push web/mobile quando o app estiver pronto.

## Marco 4 - Radar de ofertas reais

Objetivo: criar habito diario.

- Ranking de ofertas por desconto real, confiabilidade, estoque, frete e recencia.
- Tela de radar diario.
- Moderacao de ofertas suspeitas.
- Relatorio interno de cliques e alertas disparados.

## Marco 5 - Coleta e matching

Objetivo: reduzir trabalho manual sem perder confianca.

- Coleta por fontes autorizadas, feeds ou APIs antes de scraping.
- Importacao CSV/admin para fontes iniciais.
- Pipeline de matching de anuncios para produto canonico.
- Revisao manual de casos duvidosos.
- Logs e alertas de falha de coleta.

## Criterios de pronto do MVP

- Usuario cadastra conta, busca produto e entende o historico.
- Produto mostra menor preco, media e tendencia.
- Alerta dispara corretamente quando a condicao e atingida.
- Admin corrige loja, produto, oferta e snapshot.
- Logs e falhas principais aparecem para operacao.
- Testes automatizados cobrem regras criticas.
