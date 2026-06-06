
# Relatório — Por que o Remix NÃO fica 100% igual ao Master

Sem correções. Só diagnóstico, com evidências do código + estado real do banco.

---

## 1. Causa raiz (em uma frase)

O `BOOTSTRAP_MASTER_TEMPLATE.sql` **não é um snapshot do Master real (Kebab Turco Gandia)**. É um seed neutro escrito à mão, com placeholders genéricos, em paralelo ao estado real do Master. Toda divergência visual entre Master e Clone vem daí. Remix copia código + assets perfeitamente; o que não viaja é o **conteúdo do banco do Master**, e o bootstrap não tenta reproduzi-lo.

---

## 2. Evidências objetivas

### 2.1 Bootstrap insere dados NEUTROS, não os do Master

Trechos de `supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql`:

- `company_settings`: `company_name = 'Template Restaurant'`, **`logo_main_url`, `logo_main_dark_url`, `favicon_url`, `icon_192_url`, `icon_512_url`, `apple_touch_icon_url`, `og_image_url`, `banner_home_url`, `icon_dine_in_url`, `icon_takeaway_url`, `icon_delivery_url`, `logo_language_url`, `logo_order_type_url` NÃO são inseridos** (linhas 48–58).
- `totem_config`: `active_languages = {pt,en,es}`, `primary_language = 'es'`, `splash_title = 'Template Restaurant'`, **sem `splash_logo_url`, sem `splash_logo_dark_url`, sem `splash_tagline`** (linhas 106–120).
- `products` (24): todos usam `image_url = '/product-placeholder.svg'`.
- `promo_banners`: 3 banners apontando para o mesmo placeholder.
- `splash_media`: 1 linha com placeholder.

Confirmado no banco do projeto remixado atual:

```
company_settings.company_name = 'Template Restaurant'
company_settings.logo_main_url = ''  (vazio)
totem_config.active_languages = {pt,en,es}     ← Master mostra ES+EN só
splash_media.url = '/product-placeholder.svg'
```

→ Quando o cliente abre o Clone, os componentes (`useSiteBranding`, `SplashScreen`, `LanguageScreen`) leem o DB, não encontram logo/splash/títulos e caem em **fallback visual** (asset estático do repo, default tagline, etc.). É exatamente o que o print mostra: ProprioApp exibe 3 bandeiras `pt/en/es` em emoji, enquanto o Master mostra 2 bandeiras `ES/EN` em arte premium.

### 2.2 Bootstrap não marca a versão aplicada

`_template_version` está **vazio (0 rows)** no projeto remixado.

O bootstrap não faz `INSERT INTO public._template_version`. Resultado:
- `diagnoseTemplateStatus()` (`src/lib/templateVersion.ts` linha 44) devolve **`bootstrap_missing`** para sempre, mesmo após rodar.
- A tela "Versão do Template" nunca consegue mostrar "atualizado".
- Não há registro automático em `template_update_history`.

### 2.3 Bootstrap não é totalmente idempotente

Linhas sem `ON CONFLICT`:
- `categories` (134–164) → roda 2×, duplica 8 categorias.
- `products` + `product_sizes` + `product_extras` (171–341) → duplica catálogo inteiro.
- `promo_banners` (346–350) → duplica.
- `splash_media` (355–356) → duplica.

A doc `MASTER_TEMPLATE_RESTAURANT.md` promete idempotência. O código não cumpre.

### 2.4 Tabelas/configurações que o bootstrap NÃO toca

(comparado com o schema real do projeto)

- `tables` (mesas QR) — clone fica sem mapa de mesas.
- `modifier_groups`, `modifier_options`, `product_modifier_groups` — personalizações editáveis vazias. O cardápio do Master usa esses; clone não tem.
- `store_payment_gateways`, `payment_gateways` — meios de pagamento por loja não configurados.
- `printer_category_map`, `printers` — roteamento de impressão zerado.
- `platform_settings`, `platform_features`, `platform_plans`, `plan_features` — features de plataforma só viajam se já existirem (o bootstrap só lê `platform_plans` no passo 12, não cria).
- `tenant_subscriptions`, `tenant_ai_modules`, `tenant_feature_overrides` — vazios.
- `staff_access_pins`, `user_roles`, `profiles` — bootstrap não cria staff/admin.
- `splash_media` extras (vídeo/MP3 que o Master usa) — só 1 placeholder image.
- `totem_config`: campos `splash_logo_url`, `splash_logo_dark_url`, `splash_logo_size`, `welcome_message`, `splash_tagline`, `language_chip_style`, `flag_style`, etc. — não populados ou populados de forma genérica.
- `company_settings`: 14 campos de URL de logo/ícone/favicon (listados em 2.1) ficam vazios.

### 2.5 O que o Remix copia perfeitamente (não é o problema)

- Todo `src/` (componentes, contexts, hooks).
- Todo `supabase/functions/`.
- Todas as migrations em `supabase/migrations/`.
- Todos os assets do repo (`src/assets/*.asset.json` → mesma URL CDN, mesmo binário).
- `public/`, `index.html`, `manifest.json`, `service-worker.js`.
- `capacitor.config.ts`, configs.

Conclusão: **o código é idêntico**. A divergência é 100% **dados de banco**.

### 2.6 Cadeia de fallback que provoca o "parece quase igual mas não"

1. `useSiteBranding` lê `company_settings` → recebe `logo_main_url = ''`.
2. Componente cai no fallback: import estático do logo Kebab no `src/assets/` (copiado pelo Remix).
3. Cores: `primary_color = '#D62300'` (igual ao Master por coincidência do seed), mas `header_color`, `accent_color`, `cta_color` em valores diferentes do Master real.
4. `SplashScreen` lê `totem_config.splash_logo_url` (vazio) → usa logo estático + título "Template Restaurant" do DB → não bate com o Master.
5. `LanguageScreen` lê `totem_config.active_languages = {pt,en,es}` → 3 bandeiras emoji (BR/US/ES) em vez das 2 bandeiras premium ES/EN do Master.
6. `HomeScreen` lê produtos com `image_url = placeholder` → grid de placeholders.

Isso explica exatamente o que aparece na captura ProprioApp.

---

## 3. Diferenças confirmadas (Master vs Clone atual)

| Item | Master (Kebab Turco Gandia) | Clone (este projeto) | Por quê |
|---|---|---|---|
| Idiomas mostrados | ES + EN | PT + EN + ES (emoji) | `totem_config.active_languages` do bootstrap |
| Bandeiras | Cards premium com sombra | Emoji nativo | Fallback no componente quando `logo_language_url` vazio |
| Nome no splash | "Kebab Turco Gandia" | "Template Restaurant" | `splash_title` do bootstrap |
| Tagline splash | "Sabor turco autêntico" | "Sabor a cada pedido" | `splash_subtitle` genérico |
| Banners home | Imagens reais | Placeholder cinza | `promo_banners.image_url = placeholder` |
| Produtos imagens | Fotos reais | Placeholder | `products.image_url = placeholder` |
| Mesas QR | Configuradas | Vazias | `tables` não inserida |
| Personalizações | Grupos reais | Vazio | `modifier_groups` não inserida |
| Versão template | Diagnóstico OK | "bootstrap_missing" | `_template_version` não populada |

---

## 4. Diagnóstico final — onde o modelo "Atualizar → Remix → Bootstrap" quebra

O fluxo prometido nas docs assume **três coisas que não existem hoje**:

1. **Export do Master**: não há job/script que faça `pg_dump` do Master e gere o bootstrap a partir do estado real. O bootstrap é mantido manualmente e desviou do Master.
2. **Replicação de assets de DB**: URLs de logo/foto em `company_settings`, `totem_config`, `products`, `promo_banners` referenciam recursos que estão no DB do Master. Remix do código não copia conteúdo do DB, e o bootstrap usa placeholders.
3. **Selo de versão**: bootstrap não escreve `_template_version`, então o diagnóstico nunca confirma sucesso e propagação parece "perpetuamente pendente".

Soma disso: **Atualizar Template (no Master) só muda o código + migrations**, **nunca o conteúdo replicado**. O Remix cria DB vazio. O Bootstrap preenche com seed neutro divergente do Master. Logo, clone ≠ Master por design atual.

---

## 5. O que precisaria mudar (apenas referência — sem implementar agora)

Para realmente ter "remix = réplica visual idêntica":

1. **Regenerar `BOOTSTRAP_MASTER_TEMPLATE.sql` a partir de um dump real do Master** (script `pg_dump` filtrado para as tabelas template + scrub de dados pessoais). Toda vez que o Master muda branding/splash/banners/totem, regenerar.
2. **Tornar o bootstrap totalmente idempotente** com `ON CONFLICT` em todas as inserções de catálogo + banners + splash.
3. **Bootstrap escreve `_template_version`** com a `TEMPLATE_VERSION` do código no final, e registra em `template_update_history`.
4. **Replicar assets do Master para CDN com URLs estáveis** (já é o caso via `.asset.json` no repo) e usar essas URLs nos INSERTs do bootstrap em vez de `/product-placeholder.svg`.
5. **Adicionar ao bootstrap as tabelas que faltam** (`tables`, `modifier_groups`, `modifier_options`, `product_modifier_groups`, `store_payment_gateways`, `printers`, `printer_category_map`, `platform_*`, `tenant_*`).
6. **Botão "Replicar do Master agora"** no Admin que executa o bootstrap atualizado, marca a versão e registra histórico — fluxo de 1 clique no clone.

---

## 6. Decisão

Não fiz nenhuma alteração. Aguardo seu OK sobre **quais dos 6 itens acima devo atacar** (sugiro a ordem: 3, 2, 5, 4, 1, 6 — começar pelo selo de versão e idempotência, depois ampliar cobertura, depois automatizar export do Master).
