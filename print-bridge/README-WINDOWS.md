# Instalação Windows — Kebab Print Bridge

Guia passo a passo para o técnico instalar o programa que liga a impressora térmica (rede local) ao sistema na nuvem.

**Uma loja = um computador = um ficheiro `.env` com o identificador dessa loja.**

---

## O que vai precisar

- PC Windows na **mesma rede Wi‑Fi/cabo** da impressora térmica
- Node.js 18 ou superior: https://nodejs.org/
- Acesso ao painel de administração do restaurante (para copiar configurações)
- Chave **service_role** do Supabase (só neste PC — nunca no site nem no telemóvel)

---

## Passo 1 — Copiar a pasta para o PC

1. Descarregue o pacote **kebab-print-bridge.zip** no painel Admin → Impressora → **Baixar bridge Windows**
2. Extraia o ZIP para:

   `C:\kebab-print-bridge`

3. A pasta deve conter, entre outros:
   - `print-bridge.js`
   - `package.json`
   - `install-windows.bat`
   - `start-bridge.bat`
   - `.env.example`

---

## Passo 2 — Criar e editar o ficheiro `.env`

1. Na pasta `C:\kebab-print-bridge`, copie `.env.example` para `.env`  
   (o `install-windows.bat` faz isto automaticamente se ainda não existir)
2. Abra `.env` com o Bloco de notas e preencha:

### `SUPABASE_URL`

Endereço do projecto na nuvem.

- **Onde obter:** Supabase → Project Settings → API → **Project URL**  
- **Ou:** no painel Admin → Impressora → botão **Copiar .env** (já vem preenchido)

Exemplo:

```env
SUPABASE_URL=https://kvpssbhclafoymhecmuk.supabase.co
```

### `SUPABASE_SERVICE_ROLE_KEY`

Chave secreta que permite ao programa local ler a fila de impressão.

- **Onde obter:** Supabase → Project Settings → API → **service_role** (Reveal)
- **Nunca** coloque esta chave no site, no telemóvel ou envie por WhatsApp
- Cole no `.env` no PC da cozinha

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### `STORE_ID`

Identificador **desta unidade/loja**. Cada loja tem um UUID diferente.

- **Onde obter:** Admin → Impressora → escolha a unidade no selector → banner **“A configurar: …”** mostra o `STORE_ID`
- **Ou:** botão **Copiar .env** no painel (já inclui o ID da unidade seleccionada)

```env
STORE_ID=11111111-1111-1111-1111-111111111111
```

### `PRINTER_IP`

Endereço IP da impressora na rede local (ex.: NetumScan, Epson, etc.).

- Configure IP **fixo** na impressora ou reserve no router
- Teste no browser do PC: se não alcança a impressora, o bridge também não consegue

```env
PRINTER_IP=192.168.1.200
```

### `PRINTER_PORT`

Porta de impressão em rede. Quase sempre **9100** para impressoras ESC/POS.

```env
PRINTER_PORT=9100
```

---

## Passo 3 — Instalar dependências

1. Abra a pasta `C:\kebab-print-bridge`
2. Duplo clique em **`install-windows.bat`**
3. Aguarde terminar (`npm install`)

---

## Passo 4 — Testar manualmente

1. Duplo clique em **`start-bridge.bat`**
2. Deve aparecer no ecrã algo como:
   - `[CFG] Store: ...`
   - `[TEST] Impressora alcançável` (se a rede estiver OK)
   - `[BRIDGE] Aguardando jobs...`
3. No painel Admin → Impressora → clique **Imprimir teste**
4. A impressora deve imprimir um ticket de teste em poucos segundos
5. Pare o teste manual com **Ctrl+C** na janela preta

---

## Passo 5 — Instalar como serviço automático (arranca com o Windows)

1. Feche o `start-bridge.bat` se ainda estiver aberto
2. Duplo clique em **`install-service-windows.bat`**
3. Para arranque automático após reiniciar o PC:
   - Abra **Prompt de comandos como Administrador**
   - Execute: `pm2 startup`
   - Siga a linha que o PM2 mostrar (copiar/colar)
   - Depois: `pm2 save`

Comandos úteis:

```text
pm2 status
pm2 logs kebab-print-bridge
```

---

## Passo 6 — Verificar se está online no painel

1. Admin → Impressora → escolha **a mesma unidade** do `STORE_ID` no `.env`
2. Veja o cartão de estado:
   - **Bridge activo** = programa a correr e a enviar sinal
   - **Bridge inactivo** = PC desligado, programa parado ou `.env` errado
3. Clique **Verificar** se precisar actualizar
4. **Último sinal** mostra a hora da última ligação

---

## Remover o serviço

Duplo clique em **`uninstall-service-windows.bat`**

---

## Alternativa: serviço Windows com NSSM (sem PM2)

Se preferir um serviço nativo do Windows:

1. Descarregue NSSM: https://nssm.cc/download
2. Extraia `nssm.exe` para `C:\kebab-print-bridge`
3. Prompt **como Administrador**:

```cmd
cd C:\kebab-print-bridge
nssm install KebabPrintBridge "C:\Program Files\nodejs\node.exe" "C:\kebab-print-bridge\print-bridge.js"
nssm set KebabPrintBridge AppDirectory "C:\kebab-print-bridge"
nssm start KebabPrintBridge
```

Para remover:

```cmd
nssm stop KebabPrintBridge
nssm remove KebabPrintBridge confirm
```

---

## Problemas frequentes

| Sintoma | O que verificar |
|--------|------------------|
| Bridge inactivo no painel | Programa parado? `.env` com `STORE_ID` correcto? |
| Jobs na fila mas não imprime | `PRINTER_IP` correcto? Impressora ligada? Mesma rede? |
| Erro ao iniciar | Node.js instalado? Correu `install-windows.bat`? |
| Imprime na loja errada | `STORE_ID` no `.env` não corresponde à unidade |
| Falha de permissão | Use `SUPABASE_SERVICE_ROLE_KEY`, não a chave pública |

---

## Multi-loja (2+ unidades)

Repita **toda** a instalação em **cada** loja:

- PC diferente (ou VM) por unidade
- `.env` diferente com `STORE_ID` e `PRINTER_IP` dessa loja
- Teste de impressão em cada unidade antes de abrir ao público
