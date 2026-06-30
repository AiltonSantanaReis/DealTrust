# packages/contracts

Schemas, DTOs e tipos compartilhados do DealTrust.

Este pacote define contratos de borda para API, web, admin e futuro mobile. Toda entrada externa relevante deve passar por um schema explicito antes de chegar nas regras de dominio ou persistencia.

Responsabilidades iniciais:

- Auth: cadastro, login e usuario autenticado.
- Produtos: criacao, variacoes e busca.
- Ofertas: cadastro de oferta e snapshot de preco.
- Alertas: preco alvo, queda percentual e menor preco historico.
