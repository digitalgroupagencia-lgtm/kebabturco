
# Plano — Auditoria completa + Assistente Especialista Total

Entrego **3 coisas** numa execução, sem quebrar nada da UI atual.

> Observação: o projeto no código se chama **Kebab Turco** (Master Template white-label). Vou tratar como **"WGM System"** no relatório conforme você pediu — é o mesmo sistema, só o nome comercial muda.

---

## Parte 1 — Relatório PDF de Auditoria Completa

Arquivo: `WGM_Auditoria_Completa_Estrategica.pdf` (~30–40 páginas, gerado com `reportlab`, entregue como artifact para download).

Cobre **os 20 pontos** que você listou, baseado em varredura real do código (módulos, rotas, edge functions, schema das 49 tabelas, roles, integrações):

1. Visão geral · 2. Módulos existentes · 3. Funcionalidades detalhadas (pronto / parcial / falta) · 4. Banco (49 tabelas + relações) · 5. Perfis (admin_master, restaurant_admin, operator, kitchen, seller, cliente) · 6. Integrações (Stripe, Lovable AI, Push Web/Capacitor, Print Bridge Android/PC, Capacitor Android) · 7. Apps & PWAs (PWA cliente, APK Android Totem, painel restaurante, admin master) · 8. Recursos comerciais (cupons, fidelidade, banners, combos, modificadores) · 9. Operacionais (KDS, impressão por setor, delivery, mesas, vendedor) · 10. Suporte a redes (multi-tenant, multi-store, white-label) · 11. Comparação Toast / Square / Lightspeed / Zonal / GloriaFood · 12. Roadmap (tabela pronto × faltante × prioridade × estimativa) · 13. Notas 0–10.

Depois a **análise estratégica**:

14. Oportunidades em 26 segmentos (restaurantes, kebab, pizzaria, bar, café, sorveteria, padaria, food truck, dark kitchen, hotel/room service, conveniência, mercado, pet shop, farmácia, franquias, etc.) com % aderência + gaps + potencial · 15. Matriz de expansão · 16. Comparativo com 7 concorrentes · 17. Top 30 funcionalidades de alto impacto · 18. Novas fontes de receita · 19. Visão de futuro + roadmap 3/6/12/24 meses · 20. Nota final + "investiria meu dinheiro?".

**QA visual obrigatório:** converto cada página para imagem e inspeciono antes de entregar (sem texto cortado, sem sobreposição).

---

## Parte 2 — Assistente vira Especialista Total

**Problema atual:** o `SYSTEM_PROMPT` da edge function `admin-assistant` é curto e genérico → ela responde "não tenho acesso ao código".

**Correção:** reescrever **só** o `SYSTEM_PROMPT` em `supabase/functions/admin-assistant/index.ts` embutindo todo o conhecimento da auditoria (módulos, 49 tabelas, roles, integrações, fluxos de pedido, impressão, fiscal, comparativos, roadmap, segmentos). Adiciono instrução explícita: *"Você TEM o mapa completo do sistema; nunca diga que não tem acesso ao código"*.

Resultado: o **mesmo prompt** mandado no chat flutuante roxo gera uma auditoria equivalente, em streaming.

Arquivo alterado: `supabase/functions/admin-assistant/index.ts` (só o prompt — sem mexer em UI).

---

## Parte 3 — Conversa não se perde mais + memória contínua + botão copiar visível

Mudanças em `src/components/admin/AdminAssistant.tsx`:

1. **Não apagar ao fechar/minimizar/recarregar.** Hoje `messages` e `conversationId` vivem só em `useState` → somem quando você fecha. Vou:
   - Salvar `conversationId` em `localStorage` (`wgm.assistant.activeConv`).
   - Ao abrir o chat, recarregar as mensagens da conversa ativa de `ai_messages` (já existe a tabela, só não lê de volta).
   - Botão **lixeira** novo no header → único jeito de zerar (cria conversa nova).

2. **Memória contínua na conversa.** Hoje já envia `messages: next` para a edge function (histórico completo da sessão), então a IA já tem contexto da conversa atual. Com a persistência acima, ao reabrir o chat ela continua sabendo do que estavam falando, porque o histórico volta do banco e é reenviado.

3. **Botão copiar sempre visível** (hoje só aparece no hover): trocar `opacity-0 group-hover:opacity-100` por `opacity-70 hover:opacity-100` no botão de copiar de cada resposta da IA, igual ao padrão dos prompts do Lovable.

---

## Ordem de execução (modo build)

1. Varredura final (rotas, hooks, tabelas) para precisão do PDF.
2. Reescrever `SYSTEM_PROMPT` da edge function (deploy automático).
3. Editar `AdminAssistant.tsx` (persistência + lixeira + copiar visível).
4. Gerar PDF com `reportlab` em `/mnt/documents/`, fazer QA visual, entregar como artifact baixável.

**Sem migration nova, sem mexer em layout, sem quebrar fluxos existentes.** Posso seguir?
