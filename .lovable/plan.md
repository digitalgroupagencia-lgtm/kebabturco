Plano de correção

1. Corrigir o destino após login/sessão salva
- Hoje o login salvo de `admin_master` sempre chama `resolvePostLoginDestination()` e manda para `/admin`.
- Vou ajustar o fluxo para respeitar a rota que o usuário tentou abrir:
  - se entrou por `/panel`, `/panel/...`, `/admin/panel`, `/admin/orders`, `/admin/finance`, `/admin/menu`, deve ir para o painel do restaurante;
  - se entrou por `/admin`, `/admin/routes`, `/admin/plans`, etc., deve continuar no admin geral.

2. Ajustar aliases antigos sem misturar áreas
- Manter `/admin/panel` apontando para `/panel`.
- Manter `/admin/orders` apontando para `/panel`.
- Manter `/admin/finance`, `/admin/settings`, `/admin/menu` apontando para as páginas equivalentes do restaurante quando forem atalhos operacionais.
- Não deixar esses atalhos caírem no Command Center.

3. Revisar o guard do painel
- Garantir que `admin_master` também possa usar `/panel` como se fosse restaurante.
- O papel `admin_master` não deve forçar saída para `/admin` quando a rota atual é do painel.
- `seller` continua indo para área de vendedor.
- usuários sem permissão continuam indo para login.

4. Melhorar a navegação dentro do admin geral
- Adicionar/ajustar um link claro no admin geral para “Painel do Restaurante”, apontando para `/panel`.
- Assim, o mesmo login pode alternar entre:
  - `/admin` = admin geral;
  - `/panel` = painel do restaurante.

5. Atualizar testes de rota
- Cobrir os casos principais:
  - `/admin/panel` → `/panel`
  - `/admin/orders` → `/panel`
  - `/admin/finance` → `/panel/finance`
  - `/panel` permanece `/panel`
  - `/admin` permanece `/admin`
  - login com sessão salva em `/panel` não redireciona para `/admin`

6. Verificação final
- Abrir `/panel` com sessão de admin geral e confirmar que aparece “Painel do Restaurante”.
- Abrir `/admin` com a mesma sessão e confirmar que aparece o admin geral.
- Recarregar `/panel` e confirmar que continua no painel do restaurante.
- Confirmar que pedidos continuam acessíveis em `/panel`.