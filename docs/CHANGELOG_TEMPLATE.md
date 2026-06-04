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
