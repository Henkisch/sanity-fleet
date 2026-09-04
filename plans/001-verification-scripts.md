# Plan 001: Give the repo named typecheck and lint commands

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat e7c2d5e..HEAD -- package.json`
> If `package.json` changed since this plan was written, compare the
> "Current state" excerpt against the live file before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

The repo has no named way to typecheck or lint. Both tools are installed and
both pass today, but the only way to run them is to know the incantation
(`pnpm exec tsc --noEmit`). Every other plan in this directory ends its steps
with a verification command, and those commands should be stable names that
survive a tooling change rather than raw binary invocations. This plan exists
first so the rest can cite `pnpm typecheck` and `pnpm lint` and mean something.

## Current state

- `package.json` — four scripts, none of them verification:

```json
  "scripts": {
    "build": "sanity build",
    "deploy": "sanity deploy",
    "dev": "sanity dev",
    "start": "sanity start"
  },
```

- `typescript` (^5.8) and `eslint` (^10.8.1) are already in `devDependencies`;
  `eslint.config.mjs` and `tsconfig.json` both exist and both currently pass.
- Package manager is **pnpm**, pinned via `"packageManager": "pnpm@10.15.0"`.
  Use `pnpm`, never `npm` or `yarn`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm exec tsc --noEmit` | exit 0, no output   |
| Lint      | `pnpm exec eslint .`     | exit 0, no output   |
| Build     | `pnpm build`             | exit 0, "Build Sanity application" succeeds |

## Scope

**In scope** (the only file you should modify):
- `package.json`

**Out of scope** (do NOT touch):
- `eslint.config.mjs`, `tsconfig.json` — both work; changing rules is a
  separate concern and would make this plan's "no new errors" gate meaningless.
- Any source file under `src/` — this plan adds scripts, it does not fix code.
- Adding a `test` script — there is no test runner installed, and adding one
  is out of scope here.

## Git workflow

- Branch: `advisor/001-verification-scripts`
- One commit. Message style is conventional commits with a lowercase summary —
  from `git log`: `fix: line the search field up with the toolbar beneath it`.
  Use: `chore: add typecheck and lint scripts`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the two scripts

Edit the `scripts` block in `package.json` so it reads exactly:

```json
  "scripts": {
    "build": "sanity build",
    "deploy": "sanity deploy",
    "dev": "sanity dev",
    "lint": "eslint .",
    "start": "sanity start",
    "typecheck": "tsc --noEmit"
  },
```

Keys stay alphabetically sorted, matching how they are today.

**Verify**: `pnpm typecheck` → exits 0 with no output.

### Step 2: Confirm lint runs through the new name

**Verify**: `pnpm lint` → exits 0 with no output.

If `pnpm lint` reports errors, do NOT fix the source files — that is out of
scope. Report the errors and stop (see STOP conditions).

### Step 3: Confirm the build still works

**Verify**: `pnpm build` → exits 0, ends with a line containing
`Build Sanity application`.

## Test plan

There is no test runner in this repo, so there are no tests to add. The
verification for this plan is that all three commands above exit 0.

## Done criteria

ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `git status --porcelain` lists only `package.json` (and `plans/README.md`)
- [ ] `plans/README.md` status row for 001 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm lint` or `pnpm typecheck` reports pre-existing errors. This plan
  assumes both are clean at `e7c2d5e`; if they are not, the repo drifted and
  fixing it is a separate decision.
- `package.json` already contains `typecheck` or `lint` scripts with different
  definitions — someone else added them; report rather than overwrite.

## Maintenance notes

- Every other plan in `plans/` cites `pnpm typecheck` and `pnpm lint` as its
  verification gate. If these script names change, those plans go stale.
- A `test` script is deliberately absent: no runner is installed. If one is
  added later, the plans' Done criteria should grow a test gate.
