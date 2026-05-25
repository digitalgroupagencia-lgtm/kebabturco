---
name: Integrações activas
description: Conectores externos permitidos no projecto Kebab Turco
type: feature
---

## Google Maps Platform — DESLIGADO

Este projecto **não usa** Google Maps Platform.

- Não adicionar `@react-google-maps`, scripts `maps.googleapis.com`, nem connector Lovable `google_maps`.
- Não criar edge functions que chamem `connector-gateway.lovable.dev/google_maps`.
- Não usar secrets `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_*` nem `GOOGLE_MAPS_API_KEY`.
- Zonas de entrega usam **código postal e cidade** (`delivery_zones`), sem geocodificação automática.

Se o aviso "Google Maps Platform — Will not load" aparecer no Publish, a integração foi reconectada na Lovable — desligar em Definições → Integrações → Google Maps → Remover deste projecto.

## Integrações em uso

- Supabase (auth, base de dados, edge functions)
- Stripe (pagamentos)
- Lovable AI gateway (assistente admin, importação cardápio, imagens produto)
