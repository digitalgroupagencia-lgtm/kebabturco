# CHANGELOG — Master Template

Toda alteração relevante do Master Template entra aqui.
Formato: [versão] — data — descrição.

A versão atual está em `src/lib/templateVersion.ts` (`TEMPLATE_VERSION`)
e na tabela `_template_version` (banco).

---

## [1.0.0] — 2026-06-04 — Master Template inicial

### Adicionado
- `supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql` — bootstrap completo
  - 1 tenant + 1 loja
  - 8 categorias (Kebabs, Burgers, Pizzas, Saladas, Acompanhamentos, Bebidas, Sobremesas, Combos)
  - 24 produtos exemplo com nomes traduzidos pt/en/es/fr
  - Tamanhos e extras nos produtos principais
  - 3 combos
  - 3 banners placeholder
  - Splash padrão
  - Operations settings com horários semanais (loja + delivery)
  - Totem config com 3 idiomas ativos
  - Delivery zone padrão
  - Printer settings
  - Loyalty stamps (inativo)
  - Plan assignment premium
- `src/lib/templateVersion.ts` — constante `TEMPLATE_VERSION`
- Tabela `_template_version` (migration) — versão aplicada no banco
- Fallbacks UI para splash/idioma/loja/modalidade quando banco vazio
- `docs/MASTER_TEMPLATE_RESTAURANT.md`
- `docs/UPDATE_PROPAGATION_GUIDE.md`
- `docs/TEMPLATE_VALIDATION_CHECKLIST.md`

---

## Como adicionar uma nova versão

1. Incremente `TEMPLATE_VERSION` em `src/lib/templateVersion.ts` (semver):
   - patch (1.0.x): correções menores
   - minor (1.x.0): novas features compatíveis
   - major (x.0.0): mudanças incompatíveis (requer migração manual nos clientes)
2. Se houver mudança de schema, crie migration que faça `UPDATE _template_version SET version = '...'`.
3. Adicione entrada aqui descrevendo o que mudou.
4. Atualize `docs/UPDATE_PROPAGATION_GUIDE.md` se houver passo novo.
