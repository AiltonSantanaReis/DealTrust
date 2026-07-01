# Praticas de Engenharia

## Padroes obrigatorios desde o inicio

- TypeScript em modo estrito.
- Validacao de entrada em todas as bordas de API.
- Contratos compartilhados em `packages/contracts`.
- OpenAPI publicado pelo backend.
- Logs estruturados com correlation id.
- Migrations versionadas.
- Testes de regras de negocio antes de interface.
- Feature flags para funcionalidades arriscadas.
- Rate limit em auth, busca, alertas e endpoints publicos sensiveis.
- Auditoria para toda acao administrativa.

## Seguranca e privacidade

- Senhas com Argon2id ou algoritmo equivalente recomendado.
- Sessao e refresh token com rotacao e revogacao.
- Consentimento claro para notificacoes e preferencias.
- Exclusao de conta e exportacao de dados pessoais.
- Separacao entre dados publicos e privados.
- Minimo de dados sensiveis.
- Preparacao para LGPD desde o MVP.

## Qualidade de dados

DealTrust depende de confianca. Dados ruins sao mais perigosos do que falta de dados.

- Toda fonte de preco deve ter origem rastreavel.
- Toda correcao manual deve gerar auditoria.
- Matching automatico deve permitir revisao humana.
- Ofertas suspeitas nao entram no ranking publico sem criterio explicito.
- Coleta por scraping deve ser excecao, com revisao juridica e tecnica.

## Observabilidade

Medir desde cedo:

- Latencia de API.
- Erros por endpoint.
- Jobs pendentes e falhos.
- Falhas de coleta.
- Alertas disparados.
- Cliques em ofertas.
- Produtos sem historico suficiente.
- Lojas com alta taxa de suspeita.

## Testes

Prioridade:

1. Regras de preco bom, menor historico e oferta potencialmente enganosa.
2. Alertas de preco.
3. Matching de produto e variacao.
4. Permissoes administrativas.
5. Fluxos web criticos com Playwright.
