# Ruído conhecido do editor Lovable (não-bloqueador)

## `RESET_BLANK_CHECK` no console

**Origem:** mensagem emitida pelo runtime de preview do editor Lovable
(iframe `id-preview--*.lovable.app`) quando faz auto-reset entre renders.

**Onde aparece:** apenas dentro do editor / preview embebido. **Não aparece**
na app publicada (`kebabturco.lovable.app`, `kebabturco.net`,
`snaporder.digitalgroupsti.com`) nem no APK Android.

**Impacto em produção:** nenhum.
- Não afecta o cliente final.
- Não afecta KDS, pedidos, impressão, pagamentos.
- Não bloqueia builds.

**Acção:** ignorar. Não tentar "corrigir" — qualquer mudança no código da app
não remove o aviso (a origem é o host do preview).

## Auditoria de produção — sondas anónimas

O script `scripts/run-production-audit.mjs` faz chamadas **sem login** com a
anon key. Algumas RPCs (ex.: `manager_set_staff_password`,
`assign_delivery_driver`) exigem JWT válido e respondem `401 / 403 /
permission denied`. Isto **não significa que a função esteja em falta** —
significa apenas que a RLS / `SECURITY DEFINER` está a recusar o anónimo,
que é o comportamento correcto.

A versão actual do script reconhece esse padrão e marca essas funções como
`activa (requer autenticação)`. Só marca como `NÃO ACTIVA` quando o
PostgREST devolve `PGRST202` / `could not find the function`.
