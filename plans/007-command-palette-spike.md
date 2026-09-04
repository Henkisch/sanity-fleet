# Plan 007: Spike a ⌘K project switcher

> **Executor instructions**: This is a **spike**, not a build. Its output is a
> working prototype behind a flag *and a written recommendation*, not a
> finished feature. Follow the steps, run every verification command, and stop
> at the STOP conditions rather than improvising. When done, update the status
> row for this plan in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7c2d5e..HEAD -- src/routes.ts src/AppShell.tsx`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (behind a flag; nothing existing changes)
- **Depends on**: plans/001-verification-scripts.md
- **Category**: direction
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

Navigating this app means recognising a project name — which is exactly what a
command palette does better than a list. The rail holds 18 projects across two
collapsible groups, so reaching one today costs an expand plus a scan. Two
things make a palette unusually cheap here: routing is a pure function over a
hash, and every project is already in memory from `useProjects()`.

It is a spike because the value is a judgement call. Build the smallest honest
version, use it, and **recommend keep or drop**. A recommendation to drop is a
successful outcome for this plan.

## Current state

### Routing is a pure function

```ts
// src/routes.ts — the shape you will navigate with
export type Scope =
  | {kind: 'all'}
  | {kind: 'organization'; id: string}
  | {kind: 'project'; id: string}

export type View = 'overview' | 'drafts' | 'stale'

export interface Route {
  scope: Scope
  view: View
  q?: string
}
```

```ts
// src/routes.ts — the hook, returns the current route and a setter
export function useRoute(): {route: Route; navigate: (route: Route) => void}
```

`navigate({scope: {kind: 'project', id}, view: 'overview'})` is the whole
navigation API. There is no router library.

### The projects are already loaded

```tsx
// src/AppShell.tsx — SidebarData()
  const {data: projects} = useProjects()
  const {data: organizations} = useOrganizations()
```

`useProjects()` comes from `@sanity/sdk-react` and suspends on first fetch,
then serves from cache. Calling it again elsewhere does not refetch.

### The visible-project helper

```ts
// src/lib/projects.ts
export function visibleProjects(
  projects: readonly ProjectRecord[],
  prefs: Prefs,
): QueryableProject[]
```

Use this rather than filtering by hand — it honours the user's hidden-project
preferences.

### Conventions to follow

- `@sanity/ui` components for everything visual. It ships `Dialog`, `Card`,
  `Stack`, `Text` and `TextInput`, all already used in this repo. There is no
  palette component — build it from `Dialog` + `TextInput` + a list.
- No new dependencies. If you find yourself wanting `cmdk` or similar, that is
  a finding for the recommendation, not a step.
- Comments explain *why*. See any file header in `src/ui/`.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |
| Dev server| `pnpm dev`       | "Dev server started on port 3333" |

## Scope

**In scope**:
- `src/ui/CommandPalette.tsx` (create)
- `src/AppShell.tsx` (mount it, and only that)

**Out of scope** (do NOT touch):
- `src/ui/Sidebar.tsx`. Do **not** remove or shrink the rail because the
  palette exists — that is the decision this spike informs, not one it makes.
- `src/routes.ts` — the navigation API is sufficient as-is.
- Searching documents. The header already has document search; this palette
  navigates to **projects and views** only. Conflating them is a bigger design
  question.
- Any new dependency.

## Git workflow

- Branch: `advisor/007-command-palette-spike`
- Commit per step. Conventional commits, lowercase summary (see `git log`).
  Use: `feat: spike a project switcher palette`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Build the palette component

Create `src/ui/CommandPalette.tsx` exporting
`CommandPalette({open, onClose}: {open: boolean; onClose: () => void})`.

Requirements, all of them minimal on purpose:

- A Sanity UI `Dialog` containing a `TextInput` and a result list.
- Results: every project from `visibleProjects(useProjects().data, prefs)`,
  filtered by a case-insensitive substring match on `displayName`.
- Selecting a result calls
  `navigate({scope: {kind: 'project', id}, view: route.view})` and then
  `onClose()`. Keep the current *view* — someone in the Drafts view who jumps
  to a project expects that project's drafts.
- Keyboard: Up/Down move the highlight, Enter opens the highlighted result,
  Escape closes. Do not reach for a library; this is ~30 lines of state.
- The input takes focus when the dialog opens.

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Mount it behind the shortcut

In `src/AppShell.tsx`, hold `paletteOpen` state and a `keydown` listener on
`window` that opens it on ⌘K / Ctrl+K, calling `preventDefault()` so the
browser's own shortcut does not fire. Remove the listener on unmount.

Render `<CommandPalette open={paletteOpen} onClose={...} />` inside the shell.

**Verify**: `pnpm typecheck` → exits 0; `pnpm lint` → exits 0.

### Step 3: Use it, then write the recommendation

Start `pnpm dev` and actually use the palette for ten minutes of ordinary
navigation. Then append a section titled **"Spike outcome"** to this plan file
answering, in prose:

1. Did you reach for ⌘K over the rail? Say honestly if you did not.
2. What was missing — organizations, the view switch, recent projects, fuzzy
   matching rather than substring?
3. Does the rail's job change if this stays? (Do not act on the answer.)
4. **Keep, drop, or keep-with-changes** — and why, in two or three sentences.

**Verify**: the "Spike outcome" section exists in this file and answers all
four points.

## Test plan

No test runner exists in this repo. Verification is the typecheck/lint/build
gates plus the manual keyboard pass in step 3:

- ⌘K opens the palette from every view (fleet, project, drafts).
- Typing filters; Up/Down move; Enter navigates; Escape closes.
- The palette does not intercept ⌘K when focus is inside the header's search
  field — if it does, note it in the outcome.

## Done criteria

ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] ⌘K opens and Escape closes the palette in the running app
- [ ] Selecting a project navigates to it and preserves the current view
- [ ] `git diff --name-only` shows only `src/ui/CommandPalette.tsx` and `src/AppShell.tsx`
- [ ] A "Spike outcome" section is appended to this plan, answering all four points
- [ ] `plans/README.md` status row for 007 updated to DONE (with the keep/drop verdict)

## STOP conditions

Stop and report back (do not improvise) if:

- The palette needs a new dependency to work acceptably. Note what and why in
  the outcome instead — that is a useful result.
- ⌘K collides with a Sanity Dashboard shortcut when the app runs inside the
  Dashboard iframe. Record the collision; do not go hunting for another binding.
- You find yourself changing the rail, the routes, or the header search to make
  the palette fit. All three are out of scope; the spike exists to inform those
  decisions, not to pre-empt them.

## Maintenance notes

- This lands as a flagged prototype. Whoever reads the spike outcome decides
  whether it graduates; until then it is dead weight if the verdict is "drop",
  and should be reverted rather than left in.
- If the verdict is keep, the natural follow-ups are: organizations and views as
  results, a recent-projects list when the query is empty, and a visible hint in
  the header that the shortcut exists. None of those belong in the spike.
