# Print Bridge — Impressão LAN ESC/POS

Pequeno script Node.js que roda **no PC do restaurante**, escuta a fila
`print_jobs` no Supabase e envia tickets ESC/POS para a impressora térmica
via TCP na rede local.

## Instalação

1. Instale Node.js 18+ no PC.
2. Copie esta pasta inteira para o PC.
3. No painel admin → **Impressora**, clique em **Descargar configuración (.env)**
   e salve o arquivo `print-bridge.env` dentro desta pasta, renomeando para `.env`.
4. Terminal nesta pasta:
   ```bash
   npm install
   npm start
   ```

## Como serviço Windows (auto-start)

```bash
npm install -g pm2
pm2 start print-bridge.js --name print-bridge
pm2 save
pm2 startup
```

## Variáveis (.env)

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_ANON_KEY` | Anon key pública |
| `STORE_ID` | UUID da loja (deixe vazio para escutar todas) |
| `DEFAULT_PRINTER_IP` | Fallback se o job não trouxer IP |
| `DEFAULT_PRINTER_PORT` | Padrão 9100 |
