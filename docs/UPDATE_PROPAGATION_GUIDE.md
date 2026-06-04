# UPDATE PROPAGATION GUIDE

Guia prático para propagar atualizações do **Master Template** para
restaurantes já criados (clones via Remix).

---

## 1. Tipos de atualização

| Tipo | Exemplo | Onde aplicar | Como propagar |
|---|---|---|---|
| **Código** | Nova tela, fix de UI, edge function | Frontend / functions | GitHub central OU pedir no Lovable de cada projeto |
| **Banco** | Nova tabela, coluna, RPC, RLS | Migration SQL | Copiar `.sql` e aplicar em cada projeto |
| **Dados** | Novo produto, banner, preço | Catálogo do restaurante | Não propagar — local a cada loja |

---

## 2. Fluxo para atualizar CÓDIGO em todos os restaurantes

### Opção A — GitHub central (recomendada para 5+ restaurantes)

1. No **Master (Kebab Turco)**: faça a alteração e commit.
2. Em cada restaurante clone:
   - Conecte ao mesmo repo GitHub OU faça `git pull` do master.
   - Lovable detecta e aplica os arquivos automaticamente.
3. Bumpa `TEMPLATE_VERSION` em `src/lib/templateVersion.ts` no Master.

### Opção B — Manual via Lovable (até 5 restaurantes)

1. No Master, copie o texto da alteração (arquivos + diff).
2. Em cada restaurante, abra o Lovable e peça:
   > "Aplica esta alteração do Master: [colar]"
3. Verifique a versão depois.

---

## 3. Fluxo para aplicar MIGRATIONS novas

1. No Master, ao criar uma migration, ela fica em
   `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`.
2. Copie o **conteúdo completo** do arquivo.
3. Em cada restaurante:
   - Abra o Lovable.
   - Cole o SQL no chat com a instrução:
     > "Cria migration com este SQL: [colar]"
   - O Lovable cria a migration localmente e o usuário aprova.
4. A migration deve **atualizar a tabela `_template_version`** no final:
   ```sql
   UPDATE public._template_version SET version = '1.1.0', applied_at = now();
   ```

> ⚠️ **Sempre escreva migrations idempotentes**
> (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `ADD COLUMN IF NOT EXISTS`).

---

## 4. Verificar versão do banco

```sql
SELECT version, applied_at FROM public._template_version ORDER BY applied_at DESC LIMIT 1;
```

## 5. Verificar versão do código

Abra `src/lib/templateVersion.ts` no projeto e leia `TEMPLATE_VERSION`.

Ou no console do navegador (página /admin):
```js
import("/src/lib/templateVersion.ts").then(m => console.log(m.TEMPLATE_VERSION));
```

---

## 6. Identificar restaurantes desatualizados

Mantenha uma planilha simples:

| Restaurante | Versão Código | Versão Banco | Última atualização |
|---|---|---|---|
| Kebab Turco Gandia (Master) | 1.0.0 | 1.0.0 | 2026-06-04 |
| Pastelanche | 1.0.0 | 1.0.0 | 2026-06-04 |
| Pizzaria X | 0.9.0 | 0.9.0 | 2026-04-01 |

Quando lançar 1.1.0 no Master, qualquer linha com versão menor precisa atualizar.

---

## 7. Não sobrescrever customizações locais

**Nunca** copie estas pastas/tabelas do Master para um clone:

| Local | Conteúdo customizado | Por quê |
|---|---|---|
| `company_settings` (linha do tenant) | Logo, cores, nome | Cada restaurante tem identidade própria |
| `stores` (nome, endereço, telefone) | Identidade da loja | Idem |
| `products`, `categories`, `product_extras`, `product_sizes` | Cardápio | Cardápio é local |
| `promo_banners` | Banners da loja | Idem |
| `delivery_zones`, `printer_settings`, `totem_config` | Configurações operacionais | Idem |
| Secrets (Stripe, FCM, etc.) | Chaves privadas | Cada restaurante tem as suas |

**Sempre** propague:

- `src/` (todo o frontend)
- `supabase/functions/` (edge functions)
- `supabase/migrations/` novas
- `public/` (assets compartilhados)
- `docs/`

---

## 8. Checklist rápido pré-deploy de uma atualização

- [ ] Migration é idempotente?
- [ ] `TEMPLATE_VERSION` foi incrementado?
- [ ] Migration atualiza `_template_version`?
- [ ] `CHANGELOG_TEMPLATE.md` tem a entrada nova?
- [ ] Testado no Master antes de propagar?
- [ ] Lista de restaurantes a atualizar está pronta?

---

## 9. Resumo executivo

| Cenário | Ação |
|---|---|
| Alterei só o frontend | `git pull` em cada clone OU pedir ao Lovable |
| Criei uma migration | Copiar `.sql` e pedir ao Lovable para criar em cada clone |
| Alterei produto/banner | Não propagar |
| Criei novo secret | Adicionar manualmente em cada projeto |
| Subi um plan/feature global | Migration idempotente que faz `INSERT ON CONFLICT DO NOTHING` |
