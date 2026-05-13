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

### Advisor `rls_disabled_in_public` em `public.spatial_ref_sys` — não corrigível via MCP

A Supabase manda e-mails periódicos a dizer que a tabela `public.spatial_ref_sys` tem RLS desactivada. Não tentar corrigir a partir daqui — já se confirmou que **nenhum caminho SQL via MCP funciona**:

- `ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY` → `42501: must be owner of table spatial_ref_sys`. A tabela pertence a `supabase_admin`, o `postgres` não a consegue alterar.
- `ALTER EXTENSION postgis SET SCHEMA extensions` → `0A000: extension "postgis" does not support SET SCHEMA`. PostGIS não suporta esta operação (é uma limitação upstream).
- `DROP EXTENSION postgis CASCADE; CREATE EXTENSION postgis WITH SCHEMA extensions;` → também bloqueado: a extensão pertence a `supabase_admin` e o `postgres` não a consegue dropar.
- `REVOKE ... FROM anon, authenticated` em `spatial_ref_sys` → no-op silencioso, porque os grants foram dados por `supabase_admin` e o `postgres` não os pode revogar.

A única forma de tirar isto seria via dashboard da Supabase (que opera como `supabase_admin`) ou ticket de support. O conteúdo de `spatial_ref_sys` são definições de SRID do PostGIS (dados de referência públicos, idênticos em todas as instalações), não dados do utilizador.

## Verificação antes de pedir merge

- `npx --no-install tsc --noEmit`
- `npx --no-install eslint .`
- `npx --no-install next build`

Os três devem passar.
