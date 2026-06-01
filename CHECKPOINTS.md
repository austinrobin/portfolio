# Checkpoints & Versioning

This file is the log of **locked, approved versions** of the site. The rules:

- A **checkpoint** is created only when Austin explicitly says a section or page is *okay / good / locked*.
- Each checkpoint is a git **annotated tag** (`checkpoint-NN-<name>`) on a specific commit, so that exact build can always be restored.
- **Locked sections are frozen** — they are not changed without Austin's explicit permission.
- To **roll back** to any checkpoint: `git checkout checkpoint-NN-<name>` (or branch from it), then redeploy.

| # | Tag | Date | What it locks | Commit |
|---|-----|------|---------------|--------|
| 00 | `checkpoint-00-baseline` | 2026-06-01 | Initial scaffold + shell (NOT a locked design — just a restore anchor) | baseline |

> Checkpoint 00 is the first deployed build. It is a *restore point*, not an
> approved design. The first real locked checkpoint will be the landing page
> once Austin approves it.
