# Modelo de Dados Inicial

## Entidades principais

| Entidade | Responsabilidade |
| --- | --- |
| User | Conta, perfil, status, consentimentos e seguranca. |
| Role | Permissoes operacionais. |
| Category | Hierarquia de categorias. |
| Brand | Marcas e aliases. |
| Product | Produto canonico, sem diferencas de variacao. |
| ProductVariant | Cor, voltagem, memoria, tamanho, edicao e modelo especifico. |
| Store | Loja, dominio, reputacao e status. |
| Offer | Anuncio atual de uma loja para uma variacao. |
| PriceSnapshot | Historico de preco, frete, cupom, estoque e disponibilidade. |
| PriceAlert | Regra de monitoramento criada pelo usuario. |
| FavoriteList | Listas pessoais de produtos. |
| Notification | Registro de envio por canal. |
| ClickEvent | Clique em oferta, origem e contexto. |
| AdminAuditLog | Auditoria de acoes administrativas. |
| DataSource | Origem de dados: manual, feed, API, afiliado ou coletor. |

## Decisoes de modelagem

- Usar IDs publicos opacos para entidades expostas em API.
- Usar timestamps com timezone.
- Separar `Product` de `ProductVariant` para evitar historico misturado.
- Nunca sobrescrever preco historico; corrigir por novo registro auditavel.
- Particionar `PriceSnapshot` por tempo quando o volume crescer.
- Criar indices por `product_variant_id`, `store_id`, `captured_at` e disponibilidade.
- Guardar preco em centavos inteiros, nao decimal flutuante.
- Guardar moeda explicitamente, mesmo que o MVP comece em BRL.

## Regras criticas

### Preco bom

Preco atual abaixo da media dos ultimos 30 ou 90 dias, respeitando margem minima por categoria.

### Menor preco historico

Preco atual igual ou inferior ao menor preco registrado na janela analisada.

### Falsa promocao

Indicio de aumento artificial antes do desconto ou desconto baseado em preco de referencia inconsistente.

### Preco final

Sempre que houver dados confiaveis, calcular:

```text
preco_final = preco_produto + frete - cupom - cashback_confirmado
```

### Loja confiavel

Combinar dominio validado, reputacao, historico interno, consistencia de ofertas e denuncias.

## Eventos de dominio

- UserRegistered
- ProductCreated
- ProductVariantMatched
- OfferCaptured
- PriceUpdated
- HistoricalLowDetected
- SuspiciousDiscountDetected
- PriceAlertTriggered
- NotificationRequested
- StoreBlocked

