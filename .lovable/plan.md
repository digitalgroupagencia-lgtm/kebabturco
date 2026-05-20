# Plano: Base padrão de tenant + Multi-unidades + Editor visual de telas + Regras do Kebab Turco

Vou dividir em **4 entregas**, na ordem em que faz sentido construir. Você aprova e eu executo uma por vez (ou tudo, se preferir).

---

## Entrega 1 — Base padrão para novos clientes

**Objetivo:** todo cliente novo nasce com a mesma estrutura/telas/idiomas/fluxo do Kebab.

- Criar um **tenant "template"** oculto no banco (não aparece na lista de clientes), com: idiomas pt/en/es, ícones padrão, fluxo splash → idioma → unidade → tipo pedido → home, textos default em espanhol.
- Atualizar o **Wizard de Novo Cliente** com 2 opções no primeiro passo:
  - **Usar template padrão** (clona do template oculto)
  - **Clonar de cliente existente** (dropdown com tenants atuais — usa `duplicate_tenant` que já existe)
- Em ambos os casos: cria 1 store inicial vazia, copia identidade visual, idiomas, configurações de operação. Produtos só copia se "Clonar de cliente existente".

---

## Entrega 2 — Multi-unidades (Kebab Gandia + Playa de Gandia)

**Objetivo:** 1 tenant com 2+ stores, totem pergunta unidade, pedidos vão para impressora correta.

**Painel admin (novo):**
- Aba **"Unidades"** dentro do tenant: listar/criar/editar stores (nome, endereço, telefone, logo opcional, impressora atribuída, ativa sim/não).
- Cada store mantém suas próprias configurações de impressora (já existe `printer_settings.store_id`).

**Totem (fluxo público):**
- Nova tela **"Escolha a unidade"** entre Splash/Idioma e Tipo de Pedido.
- **Só aparece se o tenant tem 2+ stores ativas.** Se tem 1, pula direto.
- Cards grandes com foto da unidade + nome + endereço.
- Seleção persiste no contexto (`useResolvedStore` passa a expor `selectedStoreId` separado de `tenantStoreId`).
- Toda a navegação seguinte (cardápio, carrinho, pedido) usa a store escolhida.

**Roteamento de pedido:**
- `orders.store_id` já existe → pedido vai automaticamente para a impressora daquela store via `print-order` edge function (já filtra por `store_id`).

---

## Entrega 3 — Editor visual de telas com preview ao vivo

**Objetivo:** painel onde você clica numa tela do totem e edita logo/ícones/textos vendo o mockup do celular ao lado.

**Nova rota:** `/admin/tenants/:slug/screens`

**Layout:** split 50/50
- **Esquerda:** lista de telas (Splash, Idioma, Escolha de Unidade, Tipo de Pedido, Home/Cardápio). Clica → seleciona.
- **Direita:** mockup do celular renderizando a tela real do totem com os dados atuais. Atualiza em tempo real conforme você edita.
- **Abaixo do mockup:** formulário com os campos editáveis daquela tela específica:
  - **Splash:** logo, logo dark, título, subtítulo, duração, mídias (playlist já existe).
  - **Idioma:** logo do header, idiomas ativos, ícone de cada idioma (upload de imagem).
  - **Escolha de Unidade:** logo, título "Elige tu local", foto de cada unidade.
  - **Tipo de Pedido:** logo, ícones de **Comer aqui / Para levar / A domicílio** (upload de imagem), textos por idioma.
  - **Home:** logo do header, banner home.

**Tudo independente por tenant** (já estamos resolvendo `store_id` dinamicamente desde a entrega anterior do bug de isolamento).

**Novo no banco:**
- Adicionar opção **"a_domicilio"** nas configurações de tipo de pedido (`totem_config.enable_delivery boolean`).
- Tabela ou campos JSONB para ícones customizados de cada tipo de pedido por store.

---

## Entrega 4 — Regras de cardápio e delivery do Kebab Turco

**Objetivo:** quando você mandar a foto do cardápio depois, eu importo via IA já com essas regras aplicadas.

**Vou guardar agora em memória do projeto** (`mem://features/kebab-rules`):
- Pedido mínimo delivery Gandia: **12€**
- Fora de Gandia: **+2€** taxa entrega
- Sem alface (ou outro ingrediente removido): **+0,50€**
- Extra carne / extra frango: **+1€**
- Batata brava ou deluxe (em vez de normal no menu): **+0,50€**
- Torrinha extra: **+0,50€**
- Pão de pita "só carne" (sem outros ingredientes): **+1€**

**No sistema vou implementar:**

1. **Edição individual de itens do carrinho quando o produto é um menu com múltiplos sub-itens**
   - Hoje: ao adicionar um menu com 4 kebabs, é 1 linha só no carrinho.
   - Mudança: cada sub-item do menu vira uma linha editável → cliente clica em cada kebab e escolhe sabor + ingredientes + extras independentemente.
   - Mudanças no `ProductScreen.tsx`, `ReviewScreen.tsx` e `CartContext.tsx` (estrutura `CartItem` ganha `parentMenuId` opcional).

2. **Tipo de pedido "A domicílio"**
   - Adiciona como 3ª opção em `OrderTypeScreen`.
   - Coleta endereço + telefone.
   - Calcula taxa: se CEP/zona = Gandia → mínimo 12€; senão → +2€ entrega.
   - Configuração de zonas no painel admin do tenant (lista de bairros/CEPs considerados Gandia).

3. **Sistema de modificadores com preço**
   - Hoje `product_extras` já tem preço. Adicionar:
     - Marcar ingredientes removíveis com **preço de remoção** (negativo ou positivo — ex: "sem alface +0,50€").
     - Regra "produto sem acompanhamentos = +X€" como flag no produto.
   - Aplicado automaticamente no cálculo do `unitPrice`.

4. **Importação do cardápio (quando você mandar a foto)**
   - Uso a edge function `ai-menu-import` que já existe.
   - Configuro o prompt para extrair: nome, descrição, preço base, tamanhos, extras, ingredientes removíveis com preço.
   - Depois você revisa no painel.

---

## Ordem sugerida de execução

1. **Entrega 2** primeiro (multi-unidades) — destrava o Kebab.
2. **Entrega 1** (base padrão) — facilita próximos clientes.
3. **Entrega 3** (editor visual) — melhora UX do admin.
4. **Entrega 4** (regras + cardápio) — quando você mandar a foto do cardápio.

**Me diga:** faço tudo em sequência numa só resposta (vai ser densa mas funciona), ou prefere uma entrega por vez para revisar com calma?
