# CHANGELOG — Master Template

Toda alteração relevante do Master entra aqui. Formato semver.
Versão atual: `src/lib/templateVersion.ts` (`TEMPLATE_VERSION`) e tabela `_template_version`.

## Formato obrigatório por release

```
## [vX.Y.Z] — AAAA-MM-DD
Tipo: frontend | banco | native/android | integração | bugfix | feature | mixed
Migrations: sim/não — lista de arquivos
Rebuild APK: sim/não
Risco: baixo | médio | alto
Arquivos principais: ...
Descrição: ...
Checklist de validação: ...
```

---

## [1.1.5] — 2026-06-04
Tipo: native/android + bugfix impressão
Migrations: não
Rebuild APK: sim
Risco: médio
Arquivos principais:
- `src/services/androidPrintListener.ts`
- `src/services/printerService.ts`
Descrição:
- Corrige caso crítico em que pedidos e reimpressões entravam em `print_jobs`, mas ficavam parados como `pending` no modo `android_direct`.
- O APK Android agora varre a fila a cada 3 segundos, além de ouvir Realtime, então não depende só do evento chegar.
- Ao criar uma reimpressão/pedido no próprio app Android, tenta processar o job imediatamente.
- A reserva do job agora é atômica (`pending` → `printing`) para evitar impressão duplicada.
Checklist de validação:
- Reimprimir pedido existente no APK → job sai de `pending` e imprime.
- Criar novo pedido no APK → imprime sem precisar reiniciar app.
- Se o tablet estava fechado/offline, ao abrir novamente ele drena os jobs pendentes.

---

## [1.1.4] — 2026-06-04
Tipo: bugfix + impressão
Migrations: não
Rebuild APK: não
Risco: baixo
Arquivos principais:
- `src/lib/ticketExpansion.ts`
- `src/lib/ticketExpansion.test.ts`
- `src/services/escPosTicketBuilder.ts`
- `supabase/functions/_shared/escPosTicketBuilder.ts`
Descrição:
- Corrige impressão de combos reais onde `unitIndex` começa em `0` no banco/carrinho. Agora `0,1,2,3` vira corretamente **Pita 1, Pita 2, Pita 3, Pita 4**.
- A reimpressão passa a interpretar `configuration` e `selections` mesmo quando chegam como JSON serializado.
- Remoções do combo deixam de sair agrupadas no item principal e passam para a unidade correta.
- Classificação da carne reconhece também `Mixed/Mixte`, evitando cair como linha genérica.
Checklist de validação:
- Combo 4 Pan Pita com escolhas diferentes → impressão mostra Pita 1–4 individualmente.
- Remoções Col/Tomate/Cebolla aparecem dentro da Pita correta.
- Reimpressão pelo painel usa o mesmo formato corrigido.

---

## [1.1.3] — 2026-06-04
Tipo: feature + bugfix + frontend
Migrations: não
Rebuild APK: não
Risco: baixo
Arquivos principais:
- `src/lib/modifiers/formatOrderItem.ts` (agora agrupa por unidade)
- `src/features/ops/OpsOrderDetailSheet.tsx` (cards por unidade)
- `src/customer/screens/CustomerAccountScreen.tsx` (pedir novamente)
Descrição:
- Detalhe do pedido no painel agora mostra **um card por unidade do combo** (Pita 1, Pita 2, …) com seus modificadores, em vez de uma lista corrida.
- "Pedir novamente" passa a forçar `productType = combo` quando o pedido original tinha `comboUnits` ou `selections` com `unitIndex`, garantindo que o carrinho mantém o combo agrupado e restaura todas as escolhas individuais.
- Helper `groupOrderItemDetails` reutilizável também pelo KDS quando passar a exibir itens.

---

## [1.1.2] — 2026-06-04
Tipo: bugfix + frontend
Migrations: não
Rebuild APK: não
Risco: baixo
Arquivos principais:
- `src/lib/ticketExpansion.ts` (novo)
- `src/lib/ticketExpansion.test.ts` (novo)
- `src/services/checkoutPrintHelper.ts`
- `src/features/ops/panelPrintHelper.ts`
Descrição:
- 🚨 Correção crítica: combos com múltiplos kebabs (ex.: Combo 4 Pan Pita Mixto) agora aparecem **expandidos** no ticket de cozinha. Cada unidade (Pita 1, Pita 2, …) é impressa com sua própria carne, molhos, removidos e observações — independentes.
- Helper único `cartItemToTicketItem` / `orderItemToTicketItem` usado em checkout e reimpressão (painel/KDS), garantindo o mesmo formato.
- O builder ESC/POS já agrupa por unidade via regex `pita N` — agora alimentamos os extras com o prefixo correto a partir de `configuration.comboUnits`.
- Selections planas vindas do banco (com `unit_index`) também são reconstruídas em unidades para reimpressão fiel.
Checklist de validação:
- Combo 2 / 3 / 4 itens com carnes diferentes → ticket mostra cada Pita N com sua carne.
- Combo com remoções diferentes por unidade → "Sin X" aparece sob a unidade correta.
- Bebida do combo aparece como linha compartilhada (sem prefixo).
- Reimpressão pelo painel produz o mesmo ticket detalhado.
- Produto simples (sem combo) mantém comportamento anterior.

---

## [1.1.1] — 2026-06-04
Tipo: bugfix + frontend + banco
Migrations: sim — `20260604183418_f9ed086f-e65e-490a-9088-84a36e0331bb.sql`
Rebuild APK: não
Risco: baixo
Arquivos principais:
- `src/components/admin/AdminAssistant.tsx`
- `src/views/admin/BannerPage.tsx`
- `src/components/PromoBannerCarousel.tsx`
- `supabase/migrations/20260604183418_f9ed086f-e65e-490a-9088-84a36e0331bb.sql`
- `supabase/functions/admin-assistant/index.ts`
Descrição: respostas do Assistente Admin Master agora quebram dentro da janela e têm botão copiar; banners aceitam upload direto de imagem, MP4/MOV e MP3; carrossel respeita intervalo só para imagens e troca vídeo/áudio ao terminar; teste guiado corrige limpeza de print_jobs com enum.
Checklist de validação:
- [ ] Abrir Assistente Admin Master e confirmar que textos longos não passam da tela
- [ ] Copiar uma resposta pelo botão de copiar
- [ ] Subir imagem, MP4/MOV e MP3 em Admin → Banner
- [ ] Confirmar imagem usando intervalo e vídeo/áudio avançando ao terminar
- [ ] Rodar Admin → Simulador → Teste Guiado sem erro na etapa 2

---

## [1.1.0] — 2026-06-04
Tipo: feature + banco
Migrations: sim — `20260604181341_*` (tabela `template_update_history` + RPC `get_template_version_status`)
Rebuild APK: não
Risco: baixo
Arquivos principais:
- `supabase/migrations/20260604181341_*.sql`
- `src/lib/templateVersion.ts`
- `src/views/admin/TemplateVersionPage.tsx`
- `docs/UPDATE_PROPAGATION_GUIDE.md`
- `docs/RESTAURANT_UPDATE_CHECKLIST.md`
- `docs/MASTER_UPDATE_WORKFLOW.md`
Descrição: sistema oficial de propagação de updates do Master Template. Tabela de histórico, página admin com diagnóstico de versão (código vs banco), guia + checklist + workflow oficial.
Checklist de validação:
- [ ] Abrir `Admin Master → Sistema → Versão do Template`
- [ ] Ver versão código = 1.1.0, banco = 1.1.0, status ✅
- [ ] Botão "Registrar update" cria linha em `template_update_history`

---

## [1.0.0] — 2026-06-04
Tipo: feature
Migrations: sim — `_template_version`
Rebuild APK: não
Risco: baixo
Descrição: Master Template inicial. Bootstrap (1 tenant, 1 store, 8 categorias, 24 produtos), versionamento, fallbacks UI.
