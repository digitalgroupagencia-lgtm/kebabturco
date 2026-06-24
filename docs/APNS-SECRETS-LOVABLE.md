# Segredos APNs (iPhone push) — Lovable Cloud / Supabase

Adicione estes segredos no projeto (Edge Functions):

| Segredo | Valor |
|---------|--------|
| `APNS_KEY_ID` | Key ID da chave Push no Apple Developer (ex. `AB12CD34EF`) |
| `APNS_TEAM_ID` | `4QW32SBR7H` |
| `APNS_PRIVATE_KEY` | Conteúdo completo do ficheiro `.p8` (com `-----BEGIN PRIVATE KEY-----`) |
| `APNS_BUNDLE_ID` | `net.kebabturco.app` |
| `APNS_USE_SANDBOX` | `true` para builds Development / TestFlight interno; `false` para App Store |

É a mesma chave `.p8` que carregou no Firebase (Apple Push Notifications).

Depois de guardar, a função `send-push-notification` passa a enviar directamente para o iPhone.
