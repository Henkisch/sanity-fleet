# Plan 006: Show each project's draft count in the rail

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7c2d5e..HEAD -- src/AppShell.tsx src/fleet/FleetView.tsx src/fleet/SignalsStore.tsx src/ui/Sidebar.tsx`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/003-vertical-rhythm.md, plans/004-rail-semantics.md
  (both edit `NavItem`; land them first so this plan rebases cleanly)
- **Category**: direction
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

The app exists to answer "which project needs attention". The rail is the only
surface on screen at all times, and it currently shows names alone — the counts
that answer the question live in the content area and vanish the moment you
open a project. The numbers are already computed; they simply stop at the wrong
boundary.

This is a **direction** plan: the value is real but so is the cost, and the
cost is the interesting part. Read the trade-off in "The decision this forces"
before starting, and stop at step 1 if the measurement there says the price is
too high.

## Current state

### Where signals are computed

`src/fleet/SignalsStore.tsx` owns the fan-out. Each project gets one suspending
query behind its own boundary, and publishes into a shared map:

```tsx
// src/fleet/SignalsStore.tsx:41-52
export function useSignals(): SignalsMap {
  return useContext(SignalsContext)
}

export function SignalsProvider({
  projects,
  children,
}: {
  projects: QueryableProject[]
  children: ReactNode
}): JSX.Element {
```

`SignalsEntry` is a discriminated union: `{status: 'loading'}` |
`{status: 'ready', dataset, signals}` | `{status: 'error', dataset, error}`.
The `ready` shape carries `signals.drafts`, `signals.stale`, `signals.total`
and `signals.lastEdited`.

### Where the provider currently sits

```tsx
// src/fleet/FleetView.tsx:92 and :153
    <SignalsProvider projects={projects}>
      ...the toolbar and the table...
    </SignalsProvider>
```

It wraps the fleet view only. Open a project, or the drafts view, and the
provider unmounts — every query is discarded and re-run on return.

### Where the rail renders

`src/ui/Sidebar.tsx` — `NavItem` already accepts a `badge?: string`, used today
for the project count on organization rows:

```tsx
// src/ui/Sidebar.tsx — inside organizations.map()
              badge={String(org.projects.length)}
```

Project rows pass no badge.

### The rail's data source

```tsx
// src/AppShell.tsx — SidebarData()
  const {prefs, update, setHidden, toggleOrg} = usePrefs()
  const {data: projects} = useProjects()
  const {data: organizations} = useOrganizations()
```

## The decision this forces

Today, signals are fetched for the projects **in the current scope**, only
while the fleet table is open. Moving the provider up to `AppShell` means one
query per project on **every** view, held for the session — roughly 18 live
queries on this account instead of 0 while reading a document list.

Step 1 measures that cost before any of it is built. If the measurement comes
back bad, the honest outcome is to stop and report, not to ship it anyway.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |
| Dev server| `pnpm dev`       | "Dev server started on port 3333" |

## Scope

**In scope**:
- `src/AppShell.tsx` — host the provider, pass signals to the rail
- `src/fleet/FleetView.tsx` — stop hosting the provider
- `src/ui/Sidebar.tsx` — render the badge
- `src/fleet/SignalsStore.tsx` — only if step 3 needs it

**Out of scope** (do NOT touch):
- `src/fleet/ProjectTable.tsx` — it reads `useSignals()` and keeps working
  unchanged as long as a provider is above it. Do not adapt it.
- The GROQ in `src/lib/queries.ts`. The counts are correct; this plan moves
  them, it does not change them.
- Adding a second query, or a lighter "count only" query, for the rail. If the
  existing one is too heavy, that is the STOP condition in step 1, not an
  invitation to write another.
- Colour-coding rail rows by health. A count is information; a colour is a
  design decision nobody has made yet.

## Git workflow

- Branch: `advisor/006-rail-signals`
- Commit per step. Conventional commits, lowercase summary (see `git log`).
  Use: `feat: show each project's draft count in the rail`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Measure the cost before building anything

Start `pnpm dev`, open the printed URL, let the fleet table settle, then open a
project from the rail. In the browser console:

```js
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('api.sanity.io') && r.name.includes('/data/query/'))
  .length
```

Record the number. Then apply step 2, return here, and take the same
measurement after the same interaction.

**Verify**: you have a "before" number written down. Nothing is built yet.

**STOP if**: the before-number is already above ~60 on a settled page. That
would mean the fan-out is re-running more than expected and this plan would
multiply an existing problem — report the number instead of proceeding.

### Step 2: Move the provider to the shell

In `src/AppShell.tsx`, `SidebarData` already computes the visible project list.
Hoist `SignalsProvider` so it wraps both the rail and the content area, and
feed it the **union of visible and hidden** projects that the rail can show.

Remove the provider from `src/fleet/FleetView.tsx` (both the opening tag at
line 92 and its closing tag at line 153, and the now-unused import).

`ProjectTable` continues to call `useSignals()` and must keep working — that is
the check for this step.

**Verify**: `pnpm typecheck` → exits 0. In the browser, the fleet table still
shows draft/stale/document counts exactly as before.

### Step 3: Re-measure

Repeat step 1's measurement, same interaction.

**Verify**: record the "after" number. Report both numbers in your summary.

**STOP if**: the after-number is more than ~3× the before-number, or the app
visibly stutters when switching views. Report the measurements and stop — the
trade-off then needs a human decision, and the plan can be reverted with
`git revert` cleanly at this point because no UI has changed yet.

### Step 4: Pass signals into the rail

In `src/AppShell.tsx`, read `useSignals()` and hand the rail a plain map of
`projectId → draft count | null` (null while loading or on error — the rail must
not render "0" for a project whose query has not answered).

Add a matching prop to `Sidebar`: `draftCounts: Record<string, number | null>`.

**Verify**: `pnpm typecheck` → exits 0.

### Step 5: Render the badge

In `src/ui/Sidebar.tsx`, on project rows only, pass the existing `badge` prop
when the count is a number greater than zero:

```tsx
badge={draftCounts[project.id] ? String(draftCounts[project.id]) : undefined}
```

Deliberately: no badge at zero, and no badge while loading. A rail that
flickers counts on every navigation is worse than one that shows none.

Give the badge an accessible name so it does not read as a bare number —
`title={`${n} drafts waiting`}` on the badge text, or the equivalent
`aria-label` if plan 004 has landed and established a pattern.

**Verify**: `pnpm typecheck` → exits 0, `pnpm lint` → exits 0. In the browser,
expand an organization: projects with drafts show a count, projects without
show nothing, and the numbers match the table's Drafts column for the same
projects.

## Test plan

No test runner exists in this repo. Verification is:

1. The before/after query counts from steps 1 and 3, both recorded.
2. A cross-check: for three projects, the rail badge equals that project's
   Drafts cell in the fleet table. Name the three projects and both numbers in
   your report.

## Done criteria

ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `git grep -n "SignalsProvider" src/fleet/FleetView.tsx` returns no matches
- [ ] Fleet table still renders counts (unchanged behaviour)
- [ ] Rail badges match the table for three named projects
- [ ] Before/after query counts recorded in the report
- [ ] `git status --porcelain` lists only in-scope files (plus `plans/README.md`)
- [ ] `plans/README.md` status row for 006 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Either measurement gate in step 1 or step 3 trips.
- Moving the provider makes the fleet table lose its counts. That means
  `ProjectTable` was depending on provider identity or remount behaviour, which
  is worth understanding before working around.
- The rail badges disagree with the table for the same project. Two renderers of
  one number must not diverge; report it rather than reconciling in the UI.
- You need to add a second query to make this perform. Out of scope by design.

## Maintenance notes

- After this lands, `SignalsStore` is a session-lifetime fetcher rather than a
  view-lifetime one. Any future work that grows the per-project query — more
  counts, a heavier projection — pays that cost on every view, not just the
  fleet table. Re-run step 1's measurement when that happens.
- The `stale` and `total` counts are also in the map and deliberately unused in
  the rail. Adding them would put three numbers on a 236px row; if that is ever
  wanted, it is a design decision, not a fill-in-the-blank.
- A reviewer should check the drafts view and a project page, not just the
  fleet table — those are the views that previously ran zero project queries.
