# MASTER UPDATE WORKFLOW

Fluxo oficial para lançar uma atualização no Master Template e propagá-la
para todos os restaurantes clonados.

---

## Pipeline

```
Melhoria no Master
   ↓
Atualizar TEMPLATE_VERSION
   ↓
Criar migration (se houver schema novo)
   ↓
Atualizar CHANGELOG_TEMPLATE.md
   ↓
Testar no Master (smoke test completo)
   ↓
Push para GitHub
   ↓
Em cada restaurante clone:
   git pull → npm install → build → npx cap sync (se nativo)
   aplicar migrations
   conferir _template_version
   rodar checklist (RESTAURANT_UPDATE_CHECKLIST.md)
   registrar em template_update_history
   ↓
Atualizado ✅
```

---

## Regras

1. **SemVer estrito**
   - `patch` (1.0.x): fix sem schema.
   - `minor` (1.x.0): feature compatível, migration aditiva.
   - `major` (x.0.0): breaking — exige plano manual.

2. **Migrations sempre idempotentes**
   `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`.

3. **Toda migration relevante** termina com:
   ```sql
   UPDATE public._template_version SET version = 'X.Y.Z', applied_at = now();
   ```

4. **CHANGELOG_TEMPLATE.md** registra obrigatoriamente:
   - versão, data, tipo, arquivos, migrations, rebuild APK?, risco, checklist.

5. **Nunca propagar dados** (catálogo, banners, configs locais, secrets).

6. **Rebuild APK** quando mexer em: plugin Capacitor, Firebase, permissões Android, impressão nativa, `capacitor.config.ts`.

7. **Registrar histórico** em `template_update_history` em cada clone após o update (a tela `Admin Master → Sistema → Versão do Template` faz isso com um clique).

---

## Tela admin de controle

`Admin Master → Sistema → Versão do Template`

Mostra:
- Versão do código (`TEMPLATE_VERSION`)
- Versão do banco (`_template_version`)
- Data da última aplicação
- Status:
  - ✅ atualizado
  - ⚠️ migrations pendentes (código > banco)
  - ⚠️ código desatualizado (banco > código)
  - ❌ bootstrap não aplicado
- Botão "Registrar update" → insere linha em `template_update_history`
- Histórico das últimas atualizações

---

## Referências

- `docs/UPDATE_PROPAGATION_GUIDE.md`
- `docs/RESTAURANT_UPDATE_CHECKLIST.md`
- `docs/CHANGELOG_TEMPLATE.md`
- `docs/TEMPLATE_VALIDATION_CHECKLIST.md`
- `src/lib/templateVersion.ts`
- `supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql`
