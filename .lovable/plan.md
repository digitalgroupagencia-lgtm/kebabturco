## O que vou fazer

### 1. Botão "Atualizar banco agora" no Admin Master

Adicionar na página **Versão do Template** (`/admin` → Versão do Template) um botão grande **"Atualizar banco para v1.1.5"** que aparece automaticamente quando o diagnóstico detecta `db_outdated` ou `bootstrap_missing`.

**Como vai funcionar (sem precisar pedir no chat):**

- O botão chama uma nova edge function `apply-pending-migrations` (roda com service_role, então tem permissão para alterar o schema).
- A função tem registrado internamente o SQL de cada versão (1.1.2, 1.1.3, 1.1.4, 1.1.5) de forma **idempotente** (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) — seguro rodar várias vezes.
- Ela lê a versão atual em `_template_version`, aplica só o que falta, atualiza `_template_version` para 1.1.5 e grava em `template_update_history`.
- Mostra progresso ("Aplicando 1.1.2… 1.1.3… ✓ Banco atualizado para 1.1.5").
- Só admin_master pode clicar (verificação de role na função).

**Limitação honesta que preciso te dizer:**
O botão funciona perfeitamente para **clones de restaurante** (Pastelanche, Playa Gandía, etc.) — eles podem se autoatualizar sozinhos.
Para o **Master Template (este projeto Kebab Turco)**, novas migrations futuras ainda precisam ser criadas por mim aqui no chat na primeira vez (porque é onde a v1.1.6, 1.1.7 etc. nascem). Depois de criadas aqui, os clones aplicam pelo botão.

### 2. Assistente IA com conhecimento completo

Reescrever o `SYSTEM_PROMPT` da edge function `admin-assistant` para cobrir tudo da plataforma em português simples:

- **Diferença Código vs Banco** — explicar como expliquei agora (código = app publicado, banco = estrutura de dados, por que ficam dessincronizados, como resolver com o botão novo)
- **Áreas do sistema:**
  - **Admin Master** — todas as páginas (Tenants, Planos, Domínios, Versão do Template, Configurações Globais, Monitoramento Financeiro, Push, etc.)
  - **Painel Restaurante** — pedidos, KDS, impressão, entregadores, mesas, vendedor, caixa, relatórios
  - **App Cliente** — fluxo de pedido (delivery/takeaway/mesa), pagamento, fidelidade, cupons, tracking
  - **Totem** — fluxo touch, splash, idiomas
- **Funcionalidades transversais:**
  - Print Bridge (modo Android vs PC, o que significa cada estado, o que fazer quando inativo)
  - Push notifications (cliente e tablet)
  - Multi-idioma (pt/en/es/fr)
  - Roles e permissões (admin_master, restaurant_admin, operator, kitchen)
  - Stripe, cupons, fidelidade, entregadores
- **Como criar novo restaurante** (Wizard IA + clonagem do Master)
- **Como configurar domínio próprio**
- **Estilo de resposta:** português simples, sem jargão técnico, com passo a passo numerado quando for ação, e oferecer botão/link quando existir um na interface.

### 3. Detalhes técnicos (resumo)

**Arquivos a criar/editar:**

- `supabase/functions/apply-pending-migrations/index.ts` (nova) — aplica SQL versionado de forma idempotente
- `src/views/admin/TemplateVersionPage.tsx` — botão "Atualizar banco" + UI de progresso
- `supabase/functions/admin-assistant/index.ts` — novo SYSTEM_PROMPT completo
- `.lovable/memory/features/assistant-knowledge.md` — atualizar regra para listar todos os temas que o assistente cobre agora

**Segurança:**
- Edge function valida `has_role(user, 'admin_master')` antes de qualquer ALTER
- Lista branca de migrations conhecidas (não executa SQL arbitrário)
- Log completo em `template_update_history` (quem, quando, o quê)

---

Posso seguir com isso?
