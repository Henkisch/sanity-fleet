# Plan 005: Move the organization and project identifiers out of the repo

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7c2d5e..HEAD -- sanity.cli.ts src/config.ts .gitignore`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: plans/001-verification-scripts.md
- **Category**: dx
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

Two identifiers naming the owner's Sanity account are committed: an
organization id in `sanity.cli.ts` and a project id in `src/config.ts`. The
repo is headed for a public remote and the owner does not want them in it.

**Be clear about what this buys.** Sanity organization and project identifiers
are *public* by design — they appear in every deployed Studio's client bundle
and in network requests from the browser. Moving them to environment variables
keeps them out of **git history**, which is the stated goal. It does **not**
make them secret, and after this change the built JavaScript will still contain
whichever project id was set at build time. Do not describe this as a security
fix in the commit message, and do not add anything to the repo that implies
these values are credentials.

There are no actual secrets in this repo — verified at `e7c2d5e`: no `.env`
files, and no token/key/password patterns in tracked source. Nothing here needs
rotating.

## Current state

### `sanity.cli.ts` — the whole file

```ts
import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    organizationId: '<org-id>',
    entry: './src/App.tsx',
    title: 'Fleet',
    icon: './static/icon.svg',
  },
})
```

This file runs in **Node**, under the Sanity CLI, at dev/build/deploy time.
`process.env` is fully available here.

### `src/config.ts:9-16`

```ts
import type {SanityConfig} from '@sanity/sdk'

const BOOTSTRAP_PROJECT_ID = process.env.SANITY_APP_BOOTSTRAP_PROJECT_ID || '<project-id>'
const BOOTSTRAP_DATASET = process.env.SANITY_APP_BOOTSTRAP_DATASET || 'production'

export const bootstrapConfig: SanityConfig[] = [
  {projectId: BOOTSTRAP_PROJECT_ID, dataset: BOOTSTRAP_DATASET},
]
```

The env-var plumbing already exists — only the hardcoded fallback needs to go.
This file runs in the **browser**. The Sanity CLI inlines variables prefixed
`SANITY_APP_` into the bundle at build time; that prefix is required and is
documented in `AGENTS.md`.

### `.gitignore` — the relevant lines

```
# Dotenv and similar local-only files
*.local
```

`.env` itself is **not** ignored. That must change before any `.env` file is
created, or this plan achieves the opposite of its goal.

### How the app uses the bootstrap project

`src/config.ts`'s own header explains it: every query in the app carries its
own `projectId`/`dataset`, so `bootstrapConfig` is only the default resource
handed to `SanityApp`. It is not the project the app displays.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |
| Dev server| `pnpm dev`       | "Dev server started on port 3333" |

## Scope

**In scope**:
- `.gitignore`
- `.env.example` (create)
- `sanity.cli.ts`
- `src/config.ts`
- `README.md` (a short setup section)

**Out of scope** (do NOT touch):
- `git filter-branch`, `git filter-repo`, or any history rewrite. The values are
  public identifiers, not credentials; rewriting history on a repo that may
  already have clones is disproportionate. If the owner wants a clean history,
  that is a separate decision they should make explicitly.
- `src/lib/**`, any component — no runtime behaviour changes here.
- Adding validation that *throws* when the variables are missing, beyond what
  step 3 specifies. A hard failure at import time would break `pnpm build` for
  anyone who has not yet made a `.env`, which is a worse first-run experience
  than a clear console warning.

## Git workflow

- Branch: `advisor/005-config-out-of-git`
- One commit. Conventional commits, lowercase summary (see `git log`).
  Use: `chore: read the org and project ids from the environment`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Ignore env files before creating any

Add to `.gitignore`, under the existing dotenv comment:

```
.env
.env.*
!.env.example
```

**Verify**: `git check-ignore -v .env` → prints a matching rule.
Then: `git check-ignore .env.example` → **exits non-zero** (i.e. the example
file is NOT ignored; it is meant to be committed).

### Step 2: Commit an example file

Create `.env.example` with the two variables and no real values:

```
# Sanity organization that owns this app. Required by `sanity dev|build|deploy`.
SANITY_APP_ORGANIZATION_ID=

# Bootstrap resource for the SDK. Any project you can read works — the app
# queries every project explicitly and does not display this one specially.
SANITY_APP_BOOTSTRAP_PROJECT_ID=
SANITY_APP_BOOTSTRAP_DATASET=production
```

**Verify**: `git status --porcelain .env.example` shows it as untracked/added
(not ignored).

### Step 3: Read the organization id from the environment

Rewrite `sanity.cli.ts`:

```ts
import {defineCliConfig} from 'sanity/cli'

/*
 * The organization id lives in the environment rather than in the repo. It is
 * a public identifier, not a secret — this only keeps it out of git history.
 * See `.env.example`.
 */
const organizationId = process.env.SANITY_APP_ORGANIZATION_ID

if (!organizationId) {
  // Not thrown: `sanity build` should still run for someone who has just
  // cloned. Deploy is the command that genuinely needs it.
  console.warn('SANITY_APP_ORGANIZATION_ID is not set — copy .env.example to .env')
}

export default defineCliConfig({
  app: {
    organizationId,
    entry: './src/App.tsx',
    title: 'Fleet',
    icon: './static/icon.svg',
  },
})
```

If TypeScript rejects `organizationId` as `string | undefined` where the CLI
type wants `string`, use `organizationId: organizationId ?? ''` and keep the
warning.

**Verify**: `pnpm typecheck` → exits 0.

### Step 4: Drop the hardcoded project fallback

In `src/config.ts`, remove the two literal fallbacks so the values come only
from the environment:

```ts
const BOOTSTRAP_PROJECT_ID = process.env.SANITY_APP_BOOTSTRAP_PROJECT_ID ?? ''
const BOOTSTRAP_DATASET = process.env.SANITY_APP_BOOTSTRAP_DATASET ?? 'production'
```

Keep `'production'` for the dataset — it is a Sanity convention, not anyone's
identifier. Update the file's header comment to say the project id is required
from the environment.

**Verify**: `pnpm typecheck` → exits 0, and
`git grep -n "<project-id>\|<org-id>" -- . ':!plans'` returns **no matches**.

### Step 5: Confirm the app still runs

Create a local `.env` (it is now git-ignored) with real values, then start the
dev server and open the URL it prints.

**Verify**: `pnpm dev` starts, and the app lists projects as before. If it
renders an error about a missing project, the `SANITY_APP_` prefix or the
`.env` location is wrong — the Sanity CLI reads `.env` from the repo root.

### Step 6: Document it

Add a short "Setup" section to `README.md`, above the existing "Running it"
section: copy `.env.example` to `.env`, fill in the two ids, and note plainly
that these are public identifiers kept out of git for tidiness rather than
secrecy. Match the README's existing prose voice — full sentences, no bullet
soup.

**Verify**: `pnpm build` → exits 0.

## Test plan

No test runner exists in this repo. The meaningful verification is the grep in
step 4 (no identifier remains in tracked files) plus the dev-server run in
step 5 (the app still works when the values come from the environment).

## Done criteria

ALL must hold:

- [ ] `git grep -n "<project-id>\|<org-id>" -- . ':!plans'` returns no matches
- [ ] `git check-ignore .env` matches a rule; `git check-ignore .env.example` does not
- [ ] `.env.example` is tracked and contains no real identifiers
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `pnpm dev` starts and the project list renders with a local `.env`
- [ ] `plans/README.md` status row for 005 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `defineCliConfig` fails at runtime with an empty `organizationId` in a way
  that breaks `pnpm build` (not just `deploy`). The plan assumes build tolerates
  it; if it does not, the tradeoff between a hard throw and a soft warning needs
  the owner's call.
- The app cannot start without a bootstrap project id — i.e. `SanityApp` errors
  on an empty `projectId`. If so, report it: the better fix is to derive the
  bootstrap resource at runtime from `useProjects()` rather than configure it,
  and that is a different plan.
- You are tempted to rewrite git history to purge the old values. Don't; it is
  explicitly out of scope.

## Maintenance notes

- The built bundle still contains whichever project id was set at build time.
  Anyone reading the deployed JavaScript can see it. That is inherent to a
  browser app talking to Sanity and is not a defect.
- If this app is ever deployed from CI, both variables must be set in the CI
  environment, and the deploy additionally needs an organization-scoped robot
  token in `SANITY_AUTH_TOKEN`. That token **is** a real secret and must only
  ever live in the CI secret store — never in `.env.example`, never in the repo.
- A reviewer should confirm the diff adds no file containing a real identifier,
  and that `.env` is ignored *before* any `.env` is created.
