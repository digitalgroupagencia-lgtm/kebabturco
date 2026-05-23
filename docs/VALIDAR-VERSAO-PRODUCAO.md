# Como validar qual versão está em produção

Depois de **Sync + Publish** na Lovable, confirma que o site público recebeu a versão nova.

## 1. Ficheiro de versão (mais fiável)

Abre no navegador:

```
https://kebabturco.net/version.json
```

Deves ver JSON com:

- `buildId` — número único do build (muda em cada Publish)
- `builtAt` — data/hora UTC do build
- `gitSha` — commit Git usado no build (ex.: `57a874e`)

**Actualiza a página com cache limpo** (Safari: manter Shift ao recarregar). Se o `buildId` não mudou após Publish, o deploy não chegou ao domínio.

## 2. Código-fonte da página

1. Abre `https://kebabturco.net/panel`
2. Ver código-fonte (Safari: Partilha → «Ver código-fonte»)
3. Procura `app-build-id` — o `content="..."` deve coincidir com `buildId` em `/version.json`

## 3. Painel → Diagnóstico

1. Entra em **Painel → Diagnóstico**
2. Linha **«Versão desta página»** — data/hora do build que o telemóvel está a correr
3. Compara com `/version.json` no mesmo momento — devem coincidir

## 4. Sinais visuais da versão operacional recente

Em **Pedidos**, a versão correcta tem:

- Faixa amarela **«Activar alertas de pedidos»** (até activares)
- Filtros **Todos · Cozinha · Balcão**
- Faixa **BALCÃO / MESA / ENTREGA** em cada pedido
- Botão **«Aceitar → Em preparação»** (não «OK / Em preparação»)

## 5. iPhone / ecrã inicial

Se adicionaste o site ao ecrã inicial:

1. Apaga o ícone antigo
2. Safari → Ajustes → Limpar histórico (ou dados do site)
3. Abre de novo `kebabturco.net/panel` no Safari
4. Repete validação do ponto 1

## 6. Service worker legado

O ficheiro `/sw.js` em produção deve ser o **matador de cache** (não precacheia a app). Se ainda vês UI antiga após `version.json` correcto, fecha todos os separadores do site e abre um novo.

## Checklist pós-Publish

- [ ] `version.json` mostra `gitSha` do commit esperado
- [ ] `app-build-id` no HTML = `buildId` em `version.json`
- [ ] Diagnóstico no telemóvel mostra a mesma versão
- [ ] Pedidos mostra faixa de alertas e layout novo
