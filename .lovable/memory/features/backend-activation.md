---
name: Activar backend (Lovable Cloud)
description: Como activar base de dados e funções do Kebab Turco na Lovable Cloud
type: feature
---

## Importante

O backend do Kebab Turco vive na **Lovable Cloud** (projecto `kvpssbhclafoymhecmuk`).  
O GitHub **não aplica** migrations nem publica funções sozinho — só o **chat da Lovable** ou o painel Cloud.

## Mensagens exactas para o chat Lovable (copiar)

**1. Base de dados (migrations pendentes de entrega — copiar):**

```
Apply all pending Supabase migrations for Kebab Turco.
```

Inclui, entre outras:
- `20260602120000_menu_catalog_rls_admin_access.sql` — permissões cardápio admin
- `20260602130000_duplicate_store_menu.sql` — função duplicar cardápio
- `20260602130100_clone_menu_to_empty_stores.sql` — cópia automática Gandia → Playa Gandia
- `20260602140000_ensure_modifier_system.sql` — tabelas personalização

Se Playa Gandia continuar vazia após migrations, colar no SQL Editor:
`supabase/scripts/CLONE_GANDIA_TO_PLAYA_GANDIA.sql`

**2. Funções do servidor (quando pagamentos/diagnóstico estiverem vermelhos):**

```
Deploy all edge functions, especially stripe-create-payment-intent, stripe-verify-payment-intent, operational-diagnostics, print-order, stripe-webhook, and send-push-notification.
```

**3. GitHub Actions (opcional):** definir secret `SUPABASE_ACCESS_TOKEN` no repo — workflow `.github/workflows/supabase-sync.yml` aplica migrations e deploy de funções em push para `main` (path `supabase/**`).

**4. Depois:** Sync + Publish → Admin → Estado do sistema → Verificar.

## O que o dono do restaurante faz

- Sync + Publish na Lovable
- Estado do sistema → Verificar
- Seguir avisos vermelhos (Recebimentos, Mesas, variável Stripe no site)

## Nota técnica para agentes

- `stripe-create-payment-intent` inclui acções `diagnostics` e `verify` como fallback se funções dedicadas não estiverem deployadas.
- Migration consolidada: `20260526170000_lovable_operational_bootstrap.sql`
