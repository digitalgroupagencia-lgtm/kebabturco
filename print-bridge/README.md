# Print Bridge — Impressão LAN ESC/POS

Pequeno programa Node.js que corre **no PC do restaurante**, consulta a fila de impressão na nuvem (Supabase) e envia tickets para a impressora térmica via rede local (TCP porta 9100).

**Instalação Windows (passo a passo para técnico):** veja **[README-WINDOWS.md](./README-WINDOWS.md)**

## Instalação rápida (qualquer SO)

1. Instale Node.js 18+ no PC.
2. Copie esta pasta para o PC (Windows: `C:\kebab-print-bridge`).
3. Copie `.env.example` → `.env` e preencha (ou use **Copiar .env** no painel Admin).
4. Terminal nesta pasta:
   ```bash
   npm install
   npm start
   ```

## Scripts Windows

| Ficheiro | Função |
|----------|--------|
| `install-windows.bat` | Instala dependências, cria `.env` |
| `start-bridge.bat` | Teste manual |
| `install-service-windows.bat` | Serviço automático via PM2 |
| `uninstall-service-windows.bat` | Remove serviço PM2 |

## Variáveis (.env)

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Obrigatório** — chave service role (só neste PC) |
| `STORE_ID` | **Obrigatório** — UUID da loja/unidade |
| `PRINTER_IP` | IP da impressora na rede local |
| `PRINTER_PORT` | Porta (normalmente 9100) |
| `DEFAULT_PRINTER_IP` / `DEFAULT_PRINTER_PORT` | Aliases legados (opcional) |
| `SUPABASE_ANON_KEY` | Fallback legado — não recomendado |

Obtenha a **service role key** em Supabase → Project Settings → API.

## Multi-loja

Cada unidade precisa do **seu** PC, **seu** `.env` com `STORE_ID` único e **sua** impressora.
