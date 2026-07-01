# Modelo de Dados Inicial

## Entidades principais

| Entidade | Responsabilidade |
| --- | --- |
| User | Conta, perfil, status, consentimentos e segurança. |
| Role | Permissões operacionais. |
| Category | Hierarquia de categorias. |
| Brand | Marcas e aliases. |
| Product | Produto canônico, sem diferenças de variação. |
| ProductVariant | Cor, voltagem, memória, tamanho, edição e modelo específico. |
| Store | Loja, domínio, reputação e status. |
| Offer | Anúncio atual de uma loja para uma variação. |
| PriceSnapshot | Histórico de preço, frete, cupom, estoque e disponibilidade. |
| PriceAlert | Regra de monitoramento criada pelo usuário. |
| FavoriteList | Listas pessoais de produtos. |
| Notification | Registro de envio por canal. |
| ClickEvent | Clique em oferta, origem e contexto. |
| AdminAuditLog | Auditoria de ações administrativas. |
| DataSource | Origem de dados: manual, feed, API, afiliado ou coletor. |

## Decisões de modelagem

- Usar IDs públicos opacos para entidades expostas em API.
- Usar timestamps com timezone.
- Separar `Product` de `ProductVariant` para evitar histórico misturado.
- Nunca sobrescrever preço histórico; corrigir por novo registro auditável.
- Particionar `PriceSnapshot` por tempo quando o volume crescer.
- Criar índices por `product_variant_id`, `store_id`, `captured_at` e disponibilidade.
- Guardar preço em centavos inteiros, não decimal flutuante.
- Guardar moeda explicitamente, mesmo que o MVP comece em BRL.

## Regras críticas

### Preço relevante

Preço atual abaixo da média dos últimos 30 ou 90 dias, respeitando margem mínima por categoria.

### Menor preço histórico

Preço atual igual ou inferior ao menor preço registrado na janela analisada.

### Oferta inconsistente

Indício de aumento artificial antes do desconto ou desconto baseado em preço de referência inconsistente.

### Preço final

Sempre que houver dados confiáveis, calcular:

```text
preco_final = preco_produto + frete - cupom - cashback_confirmado
```

### Loja confiável

Combinar domínio validado, reputação, histórico interno, consistência de ofertas e indicadores operacionais.

## Eventos de domínio

- UserRegistered
- ProductCreated
- ProductVariantMatched
- OfferCaptured
- PriceUpdated
- HistoricalLowDetected
- InconsistentDiscountDetected
- PriceAlertTriggered
- NotificationRequested
- StoreBlocked
