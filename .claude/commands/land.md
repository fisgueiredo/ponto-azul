---
description: Land the current branch on main via PR + squash merge (works with branch protection)
allowed-tools: Bash, mcp__github__create_pull_request, mcp__github__merge_pull_request, mcp__github__list_pull_requests
---

Land the current branch on `main`. The repo has branch protection on `main` so direct `git push origin main` returns HTTP 403 — this command always uses the PR + squash-merge flow via the GitHub MCP.

**Arguments:** `$ARGUMENTS` — optional one-line PR title override. If empty, generate one from the commit log.

**Steps to execute:**

1. Sanity check working tree. Run `git status -sb` and `git log --oneline @{u}..HEAD` to confirm:
   - Working tree is clean (commit anything left over first; ask before committing if it's unclear what to include).
   - Current branch is **not** `main` (refuse and stop if it is — explain that work should be on a feature branch).
   - Branch has at least one commit ahead of `origin/main` (otherwise stop: nothing to land).

2. Push the branch with `git push -u origin <current-branch>`. Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s) on network errors only — never on 403/422.

3. Check for an existing open PR for this branch via `mcp__github__list_pull_requests` (`head: "fisgueiredo:<branch>"`, `state: "open"`). If one exists, reuse its number; otherwise create one with `mcp__github__create_pull_request`:
   - `owner: "fisgueiredo"`, `repo: "ponto-azul"`, `base: "main"`, `head: "<branch>"`.
   - `title`: use `$ARGUMENTS` if non-empty; otherwise generate a concise title (under 70 chars) from the branch's commit subjects.
   - `body`: a short Summary section (1–3 bullet points) describing the change, plus a Test plan checklist. Keep it tight.

4. Squash-merge with `mcp__github__merge_pull_request`:
   - `merge_method: "squash"`.
   - `commit_title`: PR title + ` (#<PR number>)` — match the style of recent commits on `main`.
   - `commit_message`: bullet summary of the change.

5. Sync local: `git fetch origin main && git checkout main && git merge --ff-only origin/main`. Then optionally switch back to the original branch.

6. Report: PR URL, new SHA on `main`, and a one-line summary. Do not narrate intermediate steps — just the final result.

**Refuse and stop** if any of these are true (explain why):
- Working tree is dirty and you don't have clear authorization on what to commit.
- The current branch is `main` itself.
- The PR's merge call returns a non-mergeable state (conflicts, failing required checks). Surface the reason and let the user decide.

Never use `git push --force` against `main`. Never disable branch protection automatically. Never use `--no-verify`.
