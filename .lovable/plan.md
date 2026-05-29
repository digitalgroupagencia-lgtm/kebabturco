
# Auditoria Completa do SnapOrder / Kebab Turco

Objectivo: produzir um **relatório verificável** (não palpites) cobrindo cada painel, cada função crítica, cada fluxo de login, e cada integração — com testes reais executados contra a base de dados, edge functions e UI.

## O que vou auditar

### 1. Backend & Infraestrutura
- Estado do Lovable Cloud (`cloud_status`, `db_health`)
- Linter de segurança Supabase (RLS, policies, grants)
- Todas as edge functions: deploy status + smoke test (`curl_edge_functions`)
- Logs recentes de cada edge function (erros, timeouts)
- Secrets configurados (Stripe, VAPID, push, AI)
- Tabelas sem GRANT correcto / sem RLS

### 2. Autenticação (4 fluxos)
- **Cliente** (auth normal email/google) — signup + login
- **Staff PIN** (`staff-pin-login`)
- **Staff Access Code** (`staff-access-login`)
- **Admin Master** — roles em `user_roles`
- Verificação: roles atribuídos correctamente, sem recursão, sem privilege escalation

### 3. Painel do Cliente (totem/web)
Por loja activa (Gandia, Playa Gandia, etc.):
- Carregamento do cardápio (categorias + produtos activos)
- Selecção idioma (pt/en/es/fr)
- Carrinho + modificadores
- Checkout: dinheiro, cartão (Stripe), tipos (mesa/balcão/delivery)
- Zonas de entrega + cálculo de taxa
- Tracking de pedido
- Push notifications

### 4. Painel do Restaurante
Por módulo:
- **Live Orders** — recebimento realtime, mudança de status
- **Cozinha (KDS)** — fila, marcar pronto
- **Caixa** — abrir/fechar sessão, pagamentos
- **Mesas & QR** — geração QR, sessões de mesa
- **Equipa** — criar staff (`create-staff-member`), PIN
- **Vendedores** — atribuição
- **Stock** — controlo
- **Relatórios / Finance** — Stripe payouts
- **Impressão** — print-bridge + `print-order`

### 5. Painel do Entregador
- Login, pedidos atribuídos, mudança de status, confirmação entrega

### 6. Painel do Vendedor
- Mesas, novo pedido, meus pedidos

### 7. Painel Admin Master
- Cardápios por loja (verificar duplicação Gandia → Playa Gandia)
- Gestão de tenants e lojas
- Branding, idiomas, zonas
- Stripe Connect (onboarding, charges_enabled, payouts)
- IA (admin assistant, menu import, product image)
- Push central, campanhas, lealdade
- Diagnósticos

### 8. Integrações
- Stripe (secret, webhook, Connect)
- Lovable AI Gateway (modelos disponíveis)
- Push VAPID (chave fallback)
- Print bridge (heartbeat)

## Como vou executar

1. Rodar `supabase--linter`, `cloud_status`, `db_health`
2. Rodar `read_query` para checar: contagens por loja, roles, sessões abertas, pedidos órfãos, produtos sem categoria, zonas sem polígono, staff sem PIN, etc.
3. `curl_edge_functions` em cada função pública (OPTIONS + POST mínimo) para confirmar 2xx/4xx esperados
4. `edge_function_logs` em cada uma para apanhar erros silenciosos
5. Probes existentes (`runFullAppAudit`, `probeAllPanels`, `fetchAdminSystemAudit`) — chamar via DB onde possível
6. Browser real (`navigate_to_sandbox` + `observe` + `act`) para testar:
   - Login cliente
   - Adicionar ao carrinho
   - Login staff PIN
   - Abrir painel Live
   - Login admin

## Entregável

Um relatório markdown em `/mnt/documents/auditoria-completa.md` com:

```text
[OK]    item — detalhe
[WARN]  item — porquê + acção
[FAIL]  item — erro exacto + ficheiro/linha/fix sugerido
```

Agrupado por: Backend · Auth · Cliente · Restaurante · Entregador · Vendedor · Admin · Integrações.
Resumo no topo: X críticos / Y avisos / Z OK.

## Detalhes técnicos

- Não vou modificar dados de produção — só leitura + smoke tests
- Edge functions testadas com payloads mínimos válidos (sem criar pedidos reais)
- Testes UI usam tenant `kebab-turco` que já está em preview
- Cada FAIL inclui: ficheiro, função, query SQL ou request que falhou, e o fix proposto (sem aplicar)

## O que NÃO vou fazer nesta passagem

- Não vou corrigir nada automaticamente — só reportar
- Após aprovares o relatório, fazemos uma segunda passagem só de fixes, priorizada pelos críticos

Confirma e eu arranco a auditoria completa.
