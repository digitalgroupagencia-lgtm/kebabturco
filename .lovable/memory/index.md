# Memory: index.md

# Project Memory

## Core
SaaS multi-tenant de restaurantes. Totem + Painel Restaurante + Admin Master.
Primary #D62300, CTA #28A745, accent #FFC72C, bg #FFFFFF.
Nunito font. Touch-first, botões mínimo 48px.
Lovable Cloud ativo. Multi-idioma (pt/en/es/fr) com JSONB.
Roles: admin_master, restaurant_admin, operator, kitchen (tabela user_roles).
Usuário prefere instruções simples, sem edição manual. Fala português.
SEMPRE atualizar SYSTEM_PROMPT do admin-assistant ao mudar qualquer feature.

## Memories
- [Arquitetura SaaS](mem://features/architecture) — Estrutura tenant→store→totem, módulos planejados
- [Schema do banco](mem://features/db-schema) — Todas as tabelas, enums, RLS policies
- [Conhecimento do Assistente](mem://features/assistant-knowledge) — Regra: sincronizar prompt do admin-assistant a cada mudança
- [Módulo Vendedor](mem://features/seller-module) — App /seller, mesas, fechamento individual/total, billing por vendedor
