---
name: Activar backend (Lovable Cloud)
description: Como activar base de dados e funções do Kebab Turco na Lovable Cloud
type: feature
---

## Importante

O backend do Kebab Turco vive na **Lovable Cloud** (projecto `kvpssbhclafoymhecmuk`).  
O GitHub **não aplica** migrations nem publica funções sozinho — só o **chat da Lovable** ou o painel Cloud.

## Mensagens exactas para o chat Lovable (copiar)

**1. Base de dados (uma vez ou quando Estado do sistema estiver vermelho em «Base de dados»):**

```
Apply all pending Supabase migrations for Kebab Turco operational bootstrap (QR mesas, pagamentos, impressão única, caixa, diagnóstico).
```

**2. Funções do servidor (quando «Pagamentos online (servidor)» ou «Serviços do servidor» estiver vermelho):**

```
Deploy all edge functions, especially stripe-create-payment-intent, stripe-verify-payment-intent, operational-diagnostics, print-order, and stripe-webhook.
```

**3. Depois:** Sync + Publish → Admin → Estado do sistema → Verificar.

## O que o dono do restaurante faz

- Sync + Publish na Lovable
- Estado do sistema → Verificar
- Seguir avisos vermelhos (Recebimentos, Mesas, variável Stripe no site)

## Nota técnica para agentes

- `stripe-create-payment-intent` inclui acções `diagnostics` e `verify` como fallback se funções dedicadas não estiverem deployadas.
- Migration consolidada: `20260526170000_lovable_operational_bootstrap.sql`
