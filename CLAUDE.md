# Ponto Azul — instruções para o Claude Code

PWA pessoal para marcar lugares de estacionamento acessíveis. Next.js 15 + Supabase + MapLibre. Detalhes em `_design/spec.md`.

## Como colocar alterações no `main`

`main` tem branch protection no GitHub. Push directo (`git push origin main`) devolve **HTTP 403** e é o comportamento esperado — não tentar contornar nem repetir.

**A forma definitiva, sempre:**

1. Trabalhar numa branch (a do session-start, normalmente `claude/<algo>`).
2. Commit + `git push -u origin <branch>` para a branch.
3. Abrir PR `base=main, head=<branch>` via GitHub MCP (`mcp__github__create_pull_request`).
4. **Squash-merge** via GitHub MCP (`mcp__github__merge_pull_request` com `merge_method: "squash"`). O `commit_title` deve seguir o padrão dos commits recentes em `main`: descrição curta + `(#<numero do PR>)`.
5. `git fetch origin main && git checkout main && git merge --ff-only origin/main` para sincronizar local.

O slash command `/land` faz este ciclo todo. Usa-o quando o utilizador disser "mete no main", "push to main", "land it", "merge to main" ou equivalente.

Não criar PRs em qualquer outro caso sem o utilizador pedir.

## Convenções do projecto

- Estética está fechada. Não mudar paleta, espaçamentos, raios ou tipografia sem necessidade técnica.
- Texto da interface em português europeu.
- Estilos inline ou variáveis CSS (`var(--bg)`, `var(--card)`, `var(--text)`, `var(--muted)`, `var(--border)`). Sem Tailwind classes nos componentes (Tailwind v4 está instalado mas só usado para reset).
- Azul `#2774AE`, verde `#00AF54`, vermelho `#C2393C`, dourado `#E0A82E` (favoritos).

## Base de dados

Projecto Supabase: `nmhqyrqdzmfljcpwjyob` (Ponto Azul).
Migrações DDL via `mcp__02baf33f-368f-4616-8d0c-c7c40833df4d__apply_migration`. Esquema actual em `_design/spec.md` mais a coluna `pinned` e a RPC `toggle_pinned`.

## Verificação antes de pedir merge

- `npx --no-install tsc --noEmit`
- `npx --no-install eslint .`
- `npx --no-install next build`

Os três devem passar.
