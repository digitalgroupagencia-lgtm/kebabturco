# UPDATE PROPAGATION GUIDE

Guia prático para propagar atualizações do **Master Template** para
restaurantes já criados (clones via Remix).

---

## 1. Tipos de atualização

| Tipo | Exemplo | Onde aplicar | Propagação |
|---|---|---|---|
| **Frontend (web)** | Tela, fix UI, hook | `src/` | `git pull` + rebuild web |
| **Edge function** | Nova RPC, webhook | `supabase/functions/` | `git pull` (auto deploy) |
| **Banco** | Tabela, coluna, RPC, RLS | Migration SQL | Aplicar `.sql` em cada clone |
| **Native / Android** | Plugin Capacitor, permissões | `android/`, `capacitor.config.ts` | **Rebuild + reinstalar APK** |
| **Dados** | Produto, banner, preço | Catálogo do tenant | NÃO propagar (local) |

---

## 2. Atualização de CÓDIGO em um restaurante clonado

```bash
git pull
npm install
npm run build
npx cap sync android   # apenas se mexer em nativo
```

### Quando precisa rebuildar / reinstalar APK?

| Tipo de mudança | Precisa rebuild APK? |
|---|---|
| Só HTML/CSS/React | ❌ Não — basta deploy web |
| Edge function nova | ❌ Não |
| Migration SQL | ❌ Não |
| Plugin Capacitor novo / removido | ✅ Sim |
| Firebase / FCM atualizado | ✅ Sim |
| Permissão Android nova (`AndroidManifest.xml`) | ✅ Sim |
| Impressão nativa / Bluetooth nativo | ✅ Sim |
| `capacitor.config.ts` (appId/url/plugins) | ✅ Sim |

---

## 3. Atualização de BANCO (migrations)

1. No Master, localize as novas migrations em `supabase/migrations/`.
2. Copie o **SQL completo** do arquivo.
3. No restaurante clone, abra o Lovable e peça:
   > "Cria migration com este SQL: [colar]"
4. Aprove a migration.
5. Confirme que ela faz `UPDATE public._template_version SET version = 'X.Y.Z', applied_at = now();` no final.
6. Registre o update em `template_update_history` (a tela admin faz isso automaticamente).

> ⚠️ Migrations **devem ser idempotentes**:
> `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`.

---

## 4. Atualização de DADOS — NUNCA SOBRESCREVER

Estes dados são exclusivos de cada restaurante e **não** devem ser propagados:

- `products`, `categories`, `product_sizes`, `product_extras`
- `promo_banners`
- `orders`, `order_items`
- `customers`, `customer_saved_profiles`
- `payment_history`, `store_payouts`, `store_payment_ledger`
- `stripe_account_id`, secrets Stripe
- FCM tokens / `push_subscriptions`
- `print_jobs` reais
- `company_settings` (logo, cores, nome)
- `stores` (nome, endereço, telefone, horários)
- `delivery_zones`, `printer_settings`, `totem_config`

Sempre propague:

- `src/`, `public/`, `docs/`
- `supabase/functions/`
- `supabase/migrations/` novas
- `capacitor.config.ts` / `android/` (com rebuild APK)

---

## 5. Verificar versões

**Código:** `src/lib/templateVersion.ts` → `TEMPLATE_VERSION`.

**Banco:**
```sql
SELECT version, applied_at FROM public._template_version ORDER BY applied_at DESC LIMIT 1;
```

**UI:** `Admin Master → Sistema → Versão do Template`.

---

## 6. Checklist rápido pré-deploy

- [ ] Migration idempotente?
- [ ] `TEMPLATE_VERSION` incrementado?
- [ ] Migration atualiza `_template_version`?
- [ ] `CHANGELOG_TEMPLATE.md` tem a entrada nova?
- [ ] Testado no Master?
- [ ] Lista de restaurantes a atualizar pronta?
- [ ] Sinalizado se precisa rebuild APK?

Veja também `docs/RESTAURANT_UPDATE_CHECKLIST.md` e `docs/MASTER_UPDATE_WORKFLOW.md`.
