---
name: Conhecimento do Assistente IA
description: Regra obrigatória — toda mudança no sistema deve atualizar o prompt do admin-assistant
type: preference
---
REGRA: Sempre que qualquer feature/fluxo/rota/configuração nova for adicionada OU alterada no sistema, atualizar imediatamente o SYSTEM_PROMPT em `supabase/functions/admin-assistant/index.ts` para refletir a mudança.

O Assistente do Admin Master é a fonte de verdade do usuário sobre o que existe na plataforma. Ele precisa saber:
- Endereços principais: loja `/`, login `/auth`, painel `/panel`, administração `/admin`, vendedor `/seller`
- Todas as edge functions e o que cada uma faz
- Como criar novo cliente (Wizard IA)
- Como configurar domínio próprio
- Como gerar/regenerar imagens por IA
- Configurações globais em platform_settings
- Monitoramento financeiro (admin master vê tudo, restaurant_admin vê só a própria loja)
- Papéis e permissões

**Como aplicar:** ao terminar qualquer rodada de mudanças, revisar e atualizar o SYSTEM_PROMPT antes de fechar a tarefa.
