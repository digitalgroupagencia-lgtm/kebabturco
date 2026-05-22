# PWA, deploy e segurança — Kebab Turco

## Auditoria do repositório (código)

| Verificação | Resultado |
|-------------|-----------|
| Dependência de WordPress | **Não.** Zero ficheiros PHP, `wp-*`, ou temas WordPress no repo. |
| Stack | React 18 + Vite 5 + Supabase. Frontend estático após `npm run build`. |
| Ficheiros suspeitos no repo | **Nenhum** backdoor/malware encontrado. Pasta `.tools/` (scripts locais GitHub CLI) — **ignorada no git**. |
| Hosting actual de kebabturco.net | **Cloudflare + deploy estático** (headers `server: cloudflare`, `x-deployment-id`). **Não** é WordPress em produção neste domínio. |
| WordPress HostGator | Se existir num subdomínio ou conta antiga, é **ambiente separado** — não faz parte deste build. Recomenda-se desactivar ou redireccionar para evitar confusão. |

## Estrutura PWA (production-ready)

| Asset | Caminho |
|-------|---------|
| Manifest | `/manifest.json` |
| Ícone 192 | `/icon-192.png` |
| Ícone 512 | `/icon-512.png` |
| Apple Touch | `/apple-touch-icon.png` (180×180) |
| Favicon | `/favicon.ico` |
| Service Worker | Gerado pelo `vite-plugin-pwa` no build (`/sw.js` ou workbox) |
| TWA (Android) | `/public/.well-known/assetlinks.json` — **preencher** package name e SHA256 antes da Play Store |

### Manifest (campos validados)

- `start_url`: `/`
- `scope`: `/`
- `display`: `standalone`
- `theme_color` / `background_color`: `#CC0000`
- `icons`: caminhos relativos `/icon-192.png` e `/icon-512.png`

### Correcção crítica aplicada

`BrandingContext` **deixou de substituir** o manifest por blob URL / logo externa Supabase. Isso quebrava PWA Builder e validadores porque os ícones deixavam de apontar para ficheiros locais servidos pelo domínio.

## Deploy limpo (recomendado)

### Vercel

1. Importar repo GitHub `digitalgroupagencia-lgtm/kebabturco`
2. Framework: Vite — build `npm run build`, output `dist`
3. Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`
4. `vercel.json` incluído (SPA + headers para ícones/manifest)

### Netlify

1. Build command: `npm run build`, publish: `dist`
2. `netlify.toml` incluído

### DNS

Apontar `kebabturco.net` **só** para Vercel/Netlify/Lovable — **não** para HostGator WordPress.

## Checklist PWA Builder / Google Play TWA

- [ ] `https://kebabturco.net/manifest.json` — 200 OK
- [ ] `https://kebabturco.net/icon-512.png` — 200 OK, `content-type: image/png`
- [ ] `https://kebabturco.net/icon-192.png` — 200 OK
- [ ] Service worker activo após deploy
- [ ] Preencher `assetlinks.json` com package Android + fingerprint SHA256
- [ ] Bubblewrap / PWA Builder: usar URL `https://kebabturco.net`

## WordPress HostGator (acção externa ao repo)

1. Entrar no cPanel HostGator e listar ficheiros em `public_html`
2. Procurar: `wp-config.php`, plugins desconhecidos, ficheiros `.php` com `eval`, `base64_decode`, nomes aleatórios
3. Se o domínio principal já aponta para Vercel/Cloudflare, **despublicar** WordPress ou usar subdomínio `blog.kebabturco.net`
4. Alterar passwords FTP/cPanel/WordPress admin
5. Este projecto **não precisa** de WordPress para funcionar
