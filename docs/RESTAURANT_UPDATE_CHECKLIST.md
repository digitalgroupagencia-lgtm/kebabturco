# RESTAURANT UPDATE CHECKLIST

Checklist obrigatório toda vez que atualizar um restaurante clonado a partir do Master Template.

---

## 🟢 Antes de atualizar

- [ ] Backup do banco (Supabase → Database → Backups)
- [ ] Versão atual do restaurante anotada (`_template_version`)
- [ ] Versão atual do Master anotada (`TEMPLATE_VERSION` no `src/lib/templateVersion.ts`)
- [ ] Migrations pendentes identificadas (listar arquivos novos em `supabase/migrations/`)
- [ ] Tipo de mudança classificado: frontend / banco / native / mixed
- [ ] Decidido se precisa rebuild APK (ver `UPDATE_PROPAGATION_GUIDE.md` §2)

## 🟡 Durante

- [ ] `git pull`
- [ ] `npm install`
- [ ] `npm run build`
- [ ] `npx cap sync android` (se nativo)
- [ ] Aplicar migrations no Supabase do clone
- [ ] Confirmar atualização em `_template_version`
- [ ] Smoke test:
  - [ ] Login cliente
  - [ ] Cardápio carrega
  - [ ] Carrinho funciona
  - [ ] Checkout (Stripe + dinheiro)
  - [ ] Painel restaurante recebe pedido
  - [ ] Impressão automática
  - [ ] Push notification (cliente + tablet)
  - [ ] Fluxo entregador
  - [ ] KDS

## 🔵 Depois

- [ ] Versão aplicada registrada em `template_update_history`
- [ ] Data e responsável registrados
- [ ] Nome do restaurante registrado
- [ ] Observações / problemas anotados
- [ ] Se houve rebuild APK: novo APK distribuído aos tablets
- [ ] Marcado em planilha mestre de restaurantes ✅

---

## Planilha mestre sugerida

| Restaurante | Versão Código | Versão Banco | APK | Última atualização | Status |
|---|---|---|---|---|---|
| Kebab Turco (Master) | 1.1.0 | 1.1.0 | 1.1.0 | 2026-06-04 | ✅ |
| Pastelanche | 1.0.0 | 1.0.0 | 1.0.0 | 2026-05-30 | ⚠️ atrasado |
