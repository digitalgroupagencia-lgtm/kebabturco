# Regras Cursor — Travel Ship (e outros projetos Lovable)

## Activar no Cursor (2 minutos)

1. Copia `docs/cursor-rules/fluxo-lovable-portugues.mdc` para `.cursor/rules/` na raiz do projeto.
2. Se a pasta `.cursor/rules/` não existir, cria-a.
3. Reabre o projeto no Cursor (ou recarrega a janela).

No **Travel Ship**: faz o mesmo no repositório Travel Ship depois de puxar do GitHub.

## Opção global (todos os projetos)

Cursor → **Settings** → **Rules** → cola o conteúdo do ficheiro `.mdc` como regra de utilizador.

---

## GitHub + Lovable — está ligado, mas falta Sync e Publish

| O quê | Faz o quê |
|-------|-----------|
| **Ligar GitHub no Lovable** | O projecto Lovable partilha o mesmo código no GitHub |
| **Push (Cursor → GitHub)** | Guarda alterações na branch **`main`** |
| **Sync (Lovable)** | Lovable **lê** o código novo do GitHub |
| **Publish (Lovable)** | Coloca o site **online** para clientes |

**Resposta directa:** só ligar GitHub **não basta**. Depois de cada push, na Lovable: **Sync** e depois **Publish**.

---

## Fluxo diário

```
Cursor → commit → push main → GitHub
                                  ↓
                        Lovable: Sync → Publish
                                  ↓
                        Testar no site / telemóvel
```

## O que a regra faz o assistente seguir

- Respostas e resumos em **português simples**
- **Commit + push na main** após alterações (sem branch extra)
- Avisar para **Sync + Publish** na Lovable
