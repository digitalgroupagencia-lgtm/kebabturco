# Páginas públicas (preview Lovable)

Esta pasta contém **apenas** as páginas de entrada do Kebab Turco:

- `/` — loja (`Index.tsx`)
- `/auth` — login (`Auth.tsx`)
- `/install` — instalar app (`Install.tsx`, acede via URL directa)
- erro 404 (`NotFound.tsx`)

**Não criar subpastas** `panel/`, `admin/` ou `seller/` aqui — a Lovable indexa ficheiros desta pasta e o dropdown fica poluído.

Todo o painel, administração e vendedor vive em `src/views/`. As rotas do dropdown Lovable estão declaradas em `src/App.tsx`.
