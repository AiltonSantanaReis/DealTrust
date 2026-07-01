# Práticas de Engenharia

## Padrões obrigatórios desde o início

- TypeScript em modo estrito.
- Validação de entrada em todas as bordas de API.
- Contratos compartilhados em `packages/contracts`.
- OpenAPI publicado pelo backend.
- Logs estruturados com correlation id.
- Migrations versionadas.
- Testes de regras de negócio antes de interface.
- Feature flags para funcionalidades arriscadas.
- Rate limit em autenticação, busca, alertas e endpoints públicos sensíveis.
- Auditoria completa para toda ação administrativa, com antes/depois, ator, entidade, origem da requisição e mascaramento de dados sensíveis.

## Segurança e privacidade

- Senhas com Argon2id ou algoritmo equivalente recomendado.
- Sessão e refresh token com rotação e revogação.
- Consentimento claro para notificações e preferências.
- Exclusão de conta e exportação de dados pessoais.
- Separação entre dados públicos e privados.
- Mínimo de dados sensíveis.
- Headers HTTP defensivos, limite de corpo de requisição e CORS restritivo por configuração.
- Preparação para LGPD desde o MVP.

## Qualidade de dados

DealTrust depende de confiança. Dados incorretos prejudicam a decisão do usuário e a credibilidade operacional.

- Toda fonte de preço deve ter origem rastreável.
- Toda correção manual deve gerar auditoria.
- Matching automático deve permitir revisão humana.
- Ofertas inconsistentes não entram no ranking público sem critério explícito.
- Coleta por scraping deve ser exceção, com revisão jurídica e técnica.

## Observabilidade

Medir desde cedo:

- Latência de API.
- Erros por endpoint.
- Jobs pendentes e falhos.
- Falhas de coleta.
- Alertas disparados.
- Cliques em ofertas.
- Produtos sem histórico suficiente.
- Lojas com alta taxa de inconsistência operacional.

## Testes

Prioridade:

1. Regras de preço relevante, menor histórico e oferta inconsistente.
2. Alertas de preço.
3. Matching de produto e variação.
4. Permissões administrativas.
5. Fluxos web críticos com Playwright.
