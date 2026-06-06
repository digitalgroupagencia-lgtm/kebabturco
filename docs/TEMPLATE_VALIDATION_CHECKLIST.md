# TEMPLATE VALIDATION CHECKLIST

Use este checklist após clonar o Master e rodar o bootstrap.
Compare tela a tela com o **Kebab Turco Gandia** (Master).

Diferenças aceitáveis: **nome, logo, cores, produtos, banners**.
Qualquer outra diferença = bug a corrigir antes de entregar ao cliente.

---

## Cliente (frontend público)

### 1. Splash
- [ ] Logo aparece centralizado
- [ ] Tagline aparece abaixo do logo
- [ ] Barra de shimmer no rodapé
- [ ] Botão "Install App" aparece (PWA)
- [ ] Long-press no logo abre `/staff`
- [ ] Após ~900ms muda para próxima tela

### 2. Seleção de idioma
- [ ] Mostra todos os idiomas ativos do `totem_config`
- [ ] Bandeiras/ícones renderizam
- [ ] Botão "Continuar" em destaque
- [ ] Se só 1 idioma ativo, pula esta tela

### 3. Modalidade (Para llevar / Delivery / Mesa)
- [ ] 3 cards visíveis se todas ativas
- [ ] Ícones corretos
- [ ] Se QR mesa, pula direto para mesa
- [ ] Cores dos cards seguem `primary_color`

### 4. Cardápio (Home)
- [ ] Banner promocional rotativo
- [ ] Categorias horizontais (chips/cards)
- [ ] Produtos em grid 2 colunas (mobile)
- [ ] Badge "Bestseller" / "Promo" aparece
- [ ] Imagens carregam (com placeholder se faltar)
- [ ] Preço formatado com moeda

### 5. Produto (detalhe)
- [ ] Imagem grande no topo
- [ ] Nome e descrição traduzidos
- [ ] Tamanhos (radio)
- [ ] Extras (checkbox com quantidade)
- [ ] Combos: seleção de itens
- [ ] Botão "Adicionar" com preço dinâmico
- [ ] Upsell de batatas/bebidas (se config)

### 6. Carrinho
- [ ] Lista itens com extras
- [ ] Editar quantidade
- [ ] Remover item
- [ ] Subtotal + entrega + total
- [ ] Botão Checkout

### 7. Checkout
- [ ] Endereço (delivery)
- [ ] Telefone obrigatório (config)
- [ ] Cupão funciona
- [ ] Botões de pagamento corretos (Stripe, dinheiro, balcão)
- [ ] Stripe abre overlay sem bugs
- [ ] Mensagem de pagamento confirmado

### 8. Tracking (acompanhamento)
- [ ] Status atualiza em tempo real
- [ ] Realtime + polling 1s funciona
- [ ] Mostra ETA / tempo decorrido
- [ ] Cancelamento mostra mensagem
- [ ] Botão "Repetir pedido"

### 9. Mi cuenta (conta cliente)
- [ ] Lista pedidos anteriores
- [ ] Botão "Pedir de novo" recria carrinho com imagens
- [ ] Endereços salvos
- [ ] Logout

---

## Staff (interno)

### 10. Admin Master
- [ ] Login `/staff` funciona
- [ ] Dashboard com tenants/stores
- [ ] Gestão de planos/features
- [ ] AdminAssistant (IA) aparece para admin_master

### 11. Painel Restaurante (`/panel`)
- [ ] Sidebar com todos os módulos
- [ ] Header com store switcher
- [ ] Botão de update
- [ ] Tema (claro/escuro) funciona
- [ ] Acesso bloqueado para não-staff

### 12. Operação ao vivo (`/panel/live`)
- [ ] Cards de pedido por status
- [ ] Tabs: novo, em preparo, pronto, entregue
- [ ] Som de alerta (precisa "Activar alertas")
- [ ] Aceitar / cancelar pedido
- [ ] Atribuir entregador
- [ ] Detalhes do pedido em sheet

### 13. KDS (`/panel/kitchen`)
- [ ] Cards grandes, modo landscape
- [ ] Categorias por impressora
- [ ] Marcar pronto

### 14. Entregador (`/delivery`)
- [ ] Lista de pedidos atribuídos
- [ ] "Iniciar entrega" + código de confirmação
- [ ] Mapa (se Google Maps ativo)

### 15. Impressão
- [ ] Botão "Imprimir teste"
- [ ] Fila de impressão visível em admin
- [ ] Botões: limpar falhados, reintentar pendentes

---

## Integrações

### 16. Stripe
- [ ] Onboarding Connect funciona
- [ ] Pagamento processa
- [ ] Webhook recebe `payment_intent.succeeded`
- [ ] Sem overlay de debug em produção

### 17. Firebase / Push
- [ ] Service worker registado (em prod)
- [ ] Permissão de push solicitada
- [ ] Notificação chega ao cliente

### 18. Simulador (admin)
- [ ] Cria pedido fake
- [ ] Passa por todos os estados
- [ ] Limpa ao fim

---

## Banco / Versão

### 19. Verificação técnica
- [ ] `SELECT version FROM public._template_version` retorna versão esperada
- [ ] `TEMPLATE_VERSION` em `src/lib/templateVersion.ts` igual à do banco
- [ ] Bootstrap rodado sem erro
- [ ] Linter Supabase sem warnings críticos

---

## Resumo

| Bloco | Itens | OK |
|---|---|---|
| Cliente (1–9) | 9 telas | / 9 |
| Staff (10–15) | 6 painéis | / 6 |
| Integrações (16–18) | 3 | / 3 |
| Banco (19) | 1 | / 1 |
| **Total** | **19** | **/ 19** |

Restaurante pronto para produção se ≥ 18/19 ✅.
