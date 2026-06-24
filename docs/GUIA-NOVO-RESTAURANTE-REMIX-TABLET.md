# Guia completo — Novo restaurante (Remix) + Tablet

**Euro Business Group · SnapOrder / Kebab Turco Master**  
**Versão:** Junho 2026  
**Para quem vai:** clonar um restaurante novo na Lovable e ligar o tablet da loja.

---

## O que vai conseguir no fim

1. Um **restaurante novo** online (site + painel), igual ao Kebab Turco, com nome/logo/cores do cliente.
2. Um **ficheiro de instalação (APK)** no tablet — a app da cozinha/mostrador.
3. **RustDesk** instalado — para aceder ao tablet à distância (de casa ou do escritório).
4. **Não** precisa de copiar a pasta do projeto para o tablet (isso não instala a app).

---

## Visão geral (ordem certa)

| Passo | O quê | Quem faz | Tempo aprox. |
|------|--------|----------|--------------|
| 1 | Remix na Lovable | Tu / Cursor | 5 min |
| 2 | Ativar nuvem + base de dados | Tu / Cursor | 5 min |
| 3 | Correr script de arranque (SQL) | Tu / Cursor | 5 min |
| 4 | Nome, cores, logo, cardápio | Tu | 30–60 min |
| 5 | Publish na Lovable | Tu | 2 min |
| 6 | Gerar APK no Mac | Cursor / técnico | 20–40 min |
| 7 | Instalar APK no tablet | Tu (com RustDesk ou USB) | 10 min |
| 8 | Instalar RustDesk no tablet | Tu | 5 min |
| 9 | Testar pedido + impressão | Tu | 15 min |

---

## PARTE 1 — Remix na Lovable (restaurante novo)

### 1.1 Fazer o Remix

1. Abre **lovable.dev** e entra no projeto **Kebab Turco SnapOrder** (o Master).
2. Menu do projeto (canto superior) → **Remix this project**.
3. Escolhe um nome, por exemplo: `Pastelanche SnapOrder` ou `Pizzeria Roma`.
4. Confirma — nasce um **projeto novo e separado**.

> O Remix copia o **aspeto e o código** do site e do painel.  
> **Não copia:** pedidos, clientes, base de dados cheia, chaves Stripe, etc.

### 1.2 Ativar a nuvem (base de dados)

1. No projeto **novo**, abre **More** (ou menu do projeto).
2. Entra em **Cloud** / **Nuvem**.
3. Ativa a nuvem se ainda não estiver ativa — cria a base de dados desse restaurante.

### 1.3 Correr o script de arranque (obrigatório)

Sem este passo o restaurante novo fica “vazio” ou com erros.

1. No projeto novo: **More → Cloud → SQL Editor**.
2. Abre no Mac o ficheiro (no projeto Master, depois de sync):
   - `supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql`
3. Copia **todo** o conteúdo e cola no editor SQL da Lovable.
4. Clica **Run** / **Correr**.
5. Espera mensagem de sucesso.

Isto cria: loja de exemplo, categorias, produtos modelo, horários, idiomas, painéis.

### 1.4 Personalizar o restaurante

No **Admin** do projeto novo (depois de Publish):

| Item | Onde mudar |
|------|------------|
| Nome do restaurante | Admin → Configurações |
| Logo e cores | Admin → Branding |
| Cidade e idioma principal | Admin → Configurações da loja |
| Produtos e preços reais | Admin → Cardápio |
| Horários | Admin → Horários |
| Zonas de entrega | Admin → Entrega |

### 1.5 Segredos (pagamentos, notificações)

No projeto novo, em **Cloud → Secrets**, configurar (copiar do Master e adaptar):

- Chaves Stripe (teste e depois produção)
- Segredos de webhook Stripe
- Chave da IA / Lovable (se usar assistente)
- Firebase / notificações (se aplicável)

### 1.6 Publicar o site

1. Na Lovable do projeto **novo**: esperar sync do GitHub (se ligado).
2. Clicar **Publish**.
3. Anotar o endereço final, por exemplo:
   - `https://nome-restaurante.lovable.app`
   - ou domínio próprio: `https://pastelanche.net`

---

## PARTE 2 — Gerar o ficheiro APK (app do tablet)

### O que é o APK?

É o **instalador da app** no Android — como instalar WhatsApp ou Chrome.  
O tablet **não usa** a pasta `kebabturco` do Mac. Usa só o **APK**.

### 2.1 Antes de compilar — URL do restaurante novo

No projeto do **restaurante novo** (no Mac, após clone ou remix ligado ao GitHub), edita:

**Ficheiro:** `capacitor.config.ts`

Altera a linha `url` para o site publicado do restaurante novo:

```ts
server: {
  url: "https://SEU-DOMINIO-AQUI.net",  // ex.: pastelanche.net
  ...
}
```

Também podes acrescentar o domínio em `allowNavigation`.

### 2.2 Compilar no Mac (resumo técnico)

No terminal, na pasta do projeto do restaurante novo:

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

No **Android Studio**:

1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**  
   ou versão assinada para produção.
2. O APK fica em:  
   `android/app/build/outputs/apk/release/app-release.apk`  
   (ou `debug` se for teste).

### 2.3 Nome do ficheiro para enviar

Renomeia para algo claro, por exemplo:

`Pastelanche-SnapOrder-tablet-v1.apk`

Guarda num sítio fácil, por exemplo:

`~/Downloads/Pastelanche-SnapOrder-tablet-v1.apk`

---

## PARTE 3 — RustDesk (acesso remoto ao tablet)

### O que é?

**RustDesk** permite ver e controlar o tablet Android **à distância** — como TeamViewer.  
Serve para: instalar o APK, configurar impressora, resolver problemas sem ir à loja.

### O que NÃO fazer com RustDesk

- **Não** copies a pasta inteira do projeto (`kebabturco`, 40 mil ficheiros) para o tablet.  
  Isso **não instala a app** e enche a memória do tablet.

### 3.1 Instalar no Mac

1. Site: **https://rustdesk.com**
2. Descarrega versão **macOS**.
3. Instala e abre o RustDesk.
4. Anota o teu **ID** e define uma **palavra-passe** fixa (para ligares ao tablet).

### 3.2 Instalar no tablet Android

1. Na Play Store (ou APK oficial do site), instala **RustDesk**.
2. Abre a app no tablet.
3. Anota o **ID do tablet** e define **palavra-passe**.
4. No Mac: liga ao ID do tablet → introduces a palavra-passe → vês o ecrã do tablet.

### 3.3 Enviar só o APK pelo RustDesk

1. No RustDesk, com ligação ao tablet aberta.
2. Usa **Transferência de ficheiros** (ícone de pasta/setas).
3. **Computador local:** escolhe só o ficheiro `.apk` (um ficheiro, ~30–80 MB).
4. **Tablet:** pasta `Download` ou `Documents`.
5. No tablet, abre o gestor de ficheiros → toca no APK → **Instalar**.

### 3.4 Permitir instalação no tablet

Se o Android pedir:

- **Definições → Segurança → Instalar apps desconhecidos** → permitir para Ficheiros ou Chrome.

---

## PARTE 4 — Instalar e configurar a app no tablet

### 4.1 Primeira abertura

1. Abre a app **SnapOrder** / nome do restaurante no tablet.
2. Deve carregar o **site** que configuraste no `capacitor.config.ts`.
3. Se aparecer ecrã de idioma do restaurante novo — está correto.

### 4.2 Modo recomendado no tablet

- **Wi‑Fi** estável na loja.
- Tablet **ligado à corrente** (pedidos e impressão).
- Ecrã **sempre ligado** (a app já tenta manter o ecrã acordado no Android).

### 4.3 Impressora térmica

1. No painel Admin → **Impressoras**, configura IP ou Bluetooth da impressora.
2. Faz um pedido de teste.
3. Confirma que o ticket imprime na cozinha/balcão.

### 4.4 Notificações (opcional)

Se o tablet recebe alertas de pedidos novos, confirma permissões de notificação na primeira vez que a app pedir.

---

## PARTE 5 — Fluxo Cursor + Lovable (para atualizações)

Quando o Cursor altera o Master (Kebab Turco):

| Quem | Ação |
|------|------|
| **Cursor** | Altera código → commit → push **main** → push repositório Lovable → confirma **sync** |
| **Tu** | Na Lovable: só **Publish** |

Para o **restaurante novo** (projeto Remix separado):

- Ou fazes **Publish** no projeto Remix dele,  
- Ou propagas atualizações de código/SQL conforme o guia `UPDATE_PROPAGATION_GUIDE.md`.

---

## PARTE 6 — Checklist final (antes de entregar ao cliente)

### Site e painel
- [ ] Site abre no telemóvel
- [ ] Cliente consegue fazer pedido (levar / mesa / entrega)
- [ ] Pagamento teste (cartão / dinheiro)
- [ ] Painel recebe o pedido
- [ ] Cozinha (KDS) mostra o pedido

### Tablet
- [ ] APK instalado e abre o site certo
- [ ] Impressão funciona
- [ ] RustDesk instalado (ID + palavra-passe guardados)
- [ ] Teste de pedido completo na loja

### Dados
- [ ] Nome, logo e cores corretos
- [ ] Cardápio com preços reais
- [ ] Horário de funcionamento certo

---

## Erros comuns

| Problema | Causa | Solução |
|----------|--------|---------|
| Site novo “em branco” | Falta script SQL de arranque | Correr `BOOTSTRAP_MASTER_TEMPLATE.sql` |
| Tablet mostra Kebab Turco em vez do novo | URL errada no APK | Alterar `capacitor.config.ts` e gerar APK novo |
| Copiar pasta para tablet não funciona | Pasta de código ≠ app instalada | Instalar só o **APK** |
| RustDesk “Directory not empty” ao apagar cache | Normal no Chrome/Mac | Fechar Chrome e repetir; ou ignorar |
| Alteração não aparece na Lovable | Falta push ao repo Lovable + sync | Cursor faz push `lovable main` e sync |

---

## Contactos e ficheiros úteis no projeto Master

| Ficheiro | Para quê |
|----------|----------|
| `supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql` | Arranque do restaurante novo |
| `capacitor.config.ts` | URL que o tablet abre |
| `docs/MASTER_TEMPLATE_RESTAURANT.md` | Detalhe técnico do Remix |
| `docs/UPDATE_PROPAGATION_GUIDE.md` | Atualizar restaurantes já criados |
| `print-bridge/` | Ponte de impressão Windows (se usar PC na loja) |

---

## Resumo em uma frase

**Remix na Lovable → nuvem → SQL de arranque → personalizar → Publish → gerar APK com o domínio novo → enviar APK pelo RustDesk → instalar no tablet → testar.**

---

*Documento gerado para Euro Business Group. Para dúvidas na implementação, pede ao Cursor que execute os passos técnicos (push, sync, build APK).*
