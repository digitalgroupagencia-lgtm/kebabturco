---
name: Regras de preço e operação Kebab Turco
description: Regras de cardápio, modificadores e delivery específicas do tenant Kebab Turco
type: feature
---
Tenant: **Kebab Turco** (2 unidades: Gandia, Playa de Gandia).

## Delivery
- Pedido mínimo dentro de Gandia: **12 €**
- Fora de Gandia: **+2 €** de taxa de entrega (somado ao total)
- Zona de entrega é detectada por CEP (tabela `delivery_zones`); cada store tem sua lista

## Modificadores de produto (preço extra)
- Remover ingrediente padrão (ex.: "sem alface"): **+0,50 €**
- Adicionar carne extra OU frango extra: **+1,00 €**
- Trocar batata normal por **batata brava** ou **batata deluxe** (em menu): **+0,50 €**
- Torrinha extra: **+0,50 €**
- Pão de pita com **só carne** (sem outros ingredientes/acompanhamentos): **+1,00 €** (mais carne pra compensar)

## Menus com múltiplos itens (ex.: menu 4 kebabs)
- Cada sub-item do menu deve poder ser editado individualmente no carrinho:
  - Escolher sabor diferente por unidade
  - Adicionar/remover ingredientes por unidade
  - Adicionar extras pagos por unidade
- Cada sub-item vira uma linha editável no `ReviewScreen`

## Impressão
- Pedido vai para a impressora da `store` escolhida pelo cliente no totem (Gandia ou Playa de Gandia), nunca para as duas
- `print-order` edge function filtra por `store_id`