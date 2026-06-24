# Segredos APNs (iPhone push) — Lovable Cloud / Supabase

Adicione estes segredos no projeto (Edge Functions):

| Segredo | Valor |
|---------|--------|
| `APNS_KEY_ID` | Key ID da chave Push no Apple Developer (ex. `AB12CD34EF`) |
| `APNS_TEAM_ID` | `4QW32SBR7H` |
| `APNS_PRIVATE_KEY` | Conteúdo completo do ficheiro `.p8` (com `-----BEGIN PRIVATE KEY-----`) |
| `APNS_BUNDLE_ID` | `net.kebabturco.app` |
| `APNS_USE_SANDBOX` | `true` para app instalada pelo ficheiro de **teste** (.ipa / Development); `false` para App Store e TestFlight |
| `STAFF_PUSH_INTERNAL_SECRET` | Segredo para envios automáticos de pedidos — **tem de ser igual** ao valor em `platform_push_config.staff_push_secret` no Supabase (ver abaixo) |

## Alinhar alertas automáticos de pedidos (Supabase)

No SQL Editor do Supabase, depois de definir `STAFF_PUSH_INTERNAL_SECRET` na Lovable:

```sql
UPDATE public.platform_push_config
SET staff_push_secret = 'MESMO_VALOR_QUE_STAFF_PUSH_INTERNAL_SECRET'
WHERE id = 1;
```

Sem isto, os pedidos novos **não disparam** push para a equipa quando o segredo está activo na Edge Function.

É a mesma chave `.p8` que carregou no Firebase (Apple Push Notifications).

Depois de guardar, a função `send-push-notification` passa a enviar directamente para o iPhone.
