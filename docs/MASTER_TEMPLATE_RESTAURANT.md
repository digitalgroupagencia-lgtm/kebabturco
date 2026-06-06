# MASTER TEMPLATE RESTAURANT — Kebab Turco

Este projeto (**Kebab Turco Gandia**) é o **Template Master Oficial** para gerar novos restaurantes white-label.
Qualquer novo restaurante deve nascer **visualmente e estruturalmente idêntico** a este — só mudam nome, logo, cores, produtos e banners.

---

## 1. COMO CLONAR CORRETAMENTE (Remix)

O botão **Remix Project** do Lovable copia **apenas o código-fonte do frontend + edge functions**.
Ele **NÃO copia** o banco de dados nem secrets — por isso o novo projeto parece "vazio" ou "diferente".

### Fluxo correto de clonagem (3 passos obrigatórios)

1. **Remix Project** no Lovable
   → cria novo projeto com 100% do código (UI, componentes, rotas, design system).

2. **Ativar Lovable Cloud** no novo projeto
   → cria banco novo automaticamente.

3. **Rodar o script `BOOTSTRAP_NEW_RESTAURANT.sql`** (ver secção 6)
   → cria todas as tabelas, RLS, funções, triggers e dados-template (categorias, produtos exemplo, horários, idiomas).

Sem o passo 3 o novo restaurante fica sem schema → telas em branco / erros.

---

## 2. O QUE O REMIX JÁ COPIA (automático)

### Frontend
- Landing, Splash, Seleção de idioma, Seleção de loja
- Escolha: Para llevar / Delivery / Mesa
- Home, Categorias, Produtos, Carrinho, Checkout
- Acompanhamento de pedido, Conta cliente
- Customizador de produto, Combos, Extras, Modificadores

### Painéis
- Admin Master, Painel Restaurante (operador), Cozinha (KDS)
- Mostrador (cashier), Delivery (entregador), Vendedor
- Impressão, Financeiro, Configurações, Equipa, Cupões, Lealdade

### Funcionalidades
- QR Mesa, Stripe Connect, Impressora térmica (ESC/POS + Android bridge)
- Firebase / Push (web + native), Alertas sonoros, Códigos de confirmação
- Idiomas (pt/en/es/fr), Traduções JSONB, Horários, Taxas de entrega
- Edge functions completas (admin-assistant, stripe-*, push-*, print-*, etc.)

### Design System
- `src/index.css` (tokens HSL: vinho premium, nunito font)
- `tailwind.config.ts` (espaçamentos, sombras, gradientes)
- Todos os componentes shadcn customizados
- Logos placeholder, imagens em `src/assets`

---

## 3. O QUE O REMIX NÃO COPIA (e está correto assim)

- Pedidos, clientes, funcionários reais
- Push tokens, Firebase tokens
- Logs, fila de impressão, histórico
- Financeiro real (Stripe ledger, payouts)
- **Secrets**: STRIPE_SECRET_KEY, FCM keys, etc. → adicionar manualmente no novo projeto

---

## 4. CONFIGURAÇÕES QUE VÊM PRÉ-PREENCHIDAS (via SQL bootstrap)

- 1 tenant + 1 store de exemplo
- 4 categorias-template (Kebabs, Hambúrgueres, Bebidas, Sobremesas)
- 8 produtos-exemplo com imagens placeholder
- Horários padrão (10h–23h, 7 dias)
- Idiomas: pt + en + es ativos
- 1 banner promocional exemplo
- Zonas de entrega vazias (admin preenche)
- Roles: 1 admin_master + 1 restaurant_admin de teste

---

## 5. FUNÇÃO "GENERATE RESTAURANT WHITE LABEL"

Implementação prática (sem precisar de UI nova):

### Passos manuais (5 minutos)
1. Clicar **Remix Project** → escolher nome (ex: "Pastelanche")
2. Ativar **Lovable Cloud** no novo projeto
3. Abrir SQL Editor → colar `supabase/scripts/BOOTSTRAP_NEW_RESTAURANT.sql`
4. Editar em `company_settings` / `stores`:
   - `name` → Pastelanche
   - `header_color` → cor principal (hex)
   - `accent_color` → cor secundária
   - `city`, `default_language`
5. Upload do logo em **Admin → Configurações → Branding**

Pronto — 95–100% idêntico ao Kebab Turco, só com nova identidade.

---

## 6. SCRIPT DE BOOTSTRAP

Localização: `supabase/scripts/BOOTSTRAP_NEW_RESTAURANT.sql`

Este script é gerado a partir do schema atual do Kebab Turco e deve ser **atualizado sempre que houver migração** (ver secção 7).

---

## 7. COMO PROPAGAR ATUALIZAÇÕES PARA OUTROS RESTAURANTES

**Esta é a pergunta-chave que você fez.** Resposta direta:

### Tipo A — Atualização só de CÓDIGO (UI, componente, lógica frontend, edge function)

→ **Não precisa fazer nada manual.**
Cada projeto Lovable é independente, mas se você quiser propagar:

**Opção 1 (recomendada): GitHub central**
- Conecte o Kebab Turco ao GitHub
- Os outros restaurantes também conectam ao mesmo repo (ou fazem `git pull` do master)
- Cada commit no master vira PR nos outros

**Opção 2 (manual rápida): Re-Remix**
- Faz Remix do Kebab Turco atualizado → vira novo projeto
- Migra clientes para o novo (só vale para clientes novos)

**Opção 3 (caso a caso): Pedir ao Lovable**
- "Aplica no projeto X a mesma alteração que fiz no Kebab Turco em `src/...`"

### Tipo B — Atualização de BANCO (nova tabela, coluna, RPC, policy)

→ **Você precisa rodar o SQL em cada projeto.**

Fluxo correto:

1. No Kebab Turco, quando o Lovable cria uma migração, o arquivo fica em:
   ```
   supabase/migrations/20260604XXXXXX_descricao.sql
   ```

2. Copie esse arquivo. Em cada outro restaurante:
   - Abra o projeto no Lovable
   - Peça: **"Aplica esta migração: [cole o conteúdo do SQL]"**
   - O Lovable cria a migração lá e aplica.

3. Alternativa manual: abrir o SQL Editor do Lovable Cloud do outro projeto e colar o SQL direto.

### Tipo C — Atualização de DADOS (produtos, categorias, banners)

→ **Não propaga.** Cada restaurante tem o próprio catálogo.

---

## 8. CHECKLIST DE VALIDAÇÃO (teste Pastelanche)

Depois de clonar, comparar tela a tela:

- [ ] Splash idêntico (só logo/cor mudam)
- [ ] Seleção de idioma idêntica
- [ ] Home com mesmo layout de categorias
- [ ] Card de produto idêntico (mesmas sombras, bordas, tipografia)
- [ ] Carrinho idêntico
- [ ] Checkout Stripe idêntico
- [ ] Painel operador idêntico (cards de pedido, tabs, cores de status)
- [ ] KDS idêntico
- [ ] App entregador idêntico
- [ ] Admin Master idêntico

Diferenças aceitáveis: **nome, logo, cores, produtos, banners.** Mais nada.

---

## 9. RESUMO EXECUTIVO

| Pergunta | Resposta |
|---|---|
| Como criar novo restaurante? | Remix → Ativar Cloud → Rodar `BOOTSTRAP_NEW_RESTAURANT.sql` |
| Por que o Remix parece diferente? | Falta rodar o bootstrap SQL — sem ele não há schema |
| Como propagar mudança de código? | GitHub central, ou pedir ao Lovable em cada projeto |
| Como propagar mudança de banco? | Copiar o `.sql` da migração e aplicar nos outros |
| Como propagar dados (produtos)? | Não propaga — cada loja tem o próprio catálogo |
