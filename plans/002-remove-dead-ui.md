# Plan 002: Delete the card grid and the unused Meta primitive

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7c2d5e..HEAD -- src/fleet/ProjectCard.tsx src/ui/primitives.tsx`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-verification-scripts.md (for the `pnpm typecheck` / `pnpm lint` gates)
- **Category**: tech-debt
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

The fleet overview used to be a grid of cards. It is a sortable table now, and
the card component was left behind: `src/fleet/ProjectCard.tsx` is 161 lines
that nothing imports and nothing renders. `Meta` in `src/ui/primitives.tsx` is
the same story at smaller scale. Both look maintained — they typecheck, they
lint, they carry doc comments — so the next person to read the fleet directory
has to work out which of the two project renderers is live. Deleting them makes
the answer obvious.

## Current state

- `src/fleet/ProjectCard.tsx` — the old grid card. Renders one project's
  signals as a `Card` with a `StatusDot`. **No importers**: verified with
  `git grep -n "ProjectCard" -- src`, which returns only matches inside the
  file itself.
- `src/fleet/FleetView.tsx` is the live renderer and imports `ProjectTable`,
  not `ProjectCard`:

```tsx
// src/fleet/FleetView.tsx:17-18
import {ProjectTable} from './ProjectTable'
import {SignalsProvider} from './SignalsStore'
```

- `src/ui/primitives.tsx:213-223` — `Meta`, exported and unused:

```tsx
/** Label/value pair used in card footers and detail headers. */
export function Meta({label, children}: {label: string; children: ReactNode}): JSX.Element {
  return (
    <Flex align="center" gap={2}>
      <Text size={0} muted>
        {label}
      </Text>
      <Text size={0}>{children}</Text>
    </Flex>
  )
}
```

- Other exports in `primitives.tsx` **are** used and must stay: `StatusDot`
  (`ProjectTable.tsx`), `CardSkeleton` (`AppShell.tsx`, `ContentArea.tsx`,
  `CrossView.tsx`, `ProjectView.tsx`), `SkeletonLine` (`AppShell.tsx`),
  `UnavailableCard` (`ProjectView.tsx`), `ErrorCard` (`AppShell.tsx`),
  `InlineUnavailable` (`CrossView.tsx`), `StatusBadge` (`DocumentList.tsx`).

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |

## Scope

**In scope**:
- `src/fleet/ProjectCard.tsx` (delete)
- `src/ui/primitives.tsx` (remove the `Meta` function only)

**Out of scope** (do NOT touch, even though they look related):
- `src/fleet/ProjectTable.tsx` — this is the live renderer.
- Any other export in `primitives.tsx` — all seven are in use; the list above
  names each one's consumer.
- `src/fleet/SignalsStore.tsx` — used by `FleetView`, unaffected.
- Removing now-unused imports anywhere except inside `primitives.tsx` itself.

## Git workflow

- Branch: `advisor/002-remove-dead-ui`
- One commit. Conventional commits, lowercase summary (see `git log`).
  Use: `chore: delete the unused card grid and Meta primitive`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the card really is unreferenced

Run: `git grep -n "ProjectCard" -- src`

**Verify**: every line in the output is inside `src/fleet/ProjectCard.tsx`.
If any *other* file mentions it, STOP — the file is live and this plan is wrong.

### Step 2: Delete the card

Run: `git rm src/fleet/ProjectCard.tsx`

**Verify**: `pnpm typecheck` → exits 0.

### Step 3: Confirm Meta is unreferenced, then remove it

Run: `git grep -n "\bMeta\b" -- src`

**Verify**: matches occur only in `src/ui/primitives.tsx`. Note that the word
"Meta" may also appear inside unrelated identifiers — you are looking for
imports or JSX usage of this component specifically. If a real consumer
exists, STOP.

Then delete the `Meta` function (the doc comment and the function body quoted
in "Current state"). If removing it leaves `ReactNode` unused in the file's
imports, remove that type from the import list too — but change nothing else
in the file.

**Verify**: `pnpm typecheck` → exits 0. `pnpm lint` → exits 0 (a leftover
unused import would surface here as a warning).

### Step 4: Confirm the app still builds

**Verify**: `pnpm build` → exits 0.

## Test plan

No test runner exists in this repo, so there are no tests to add. Deletion of
unreferenced code is verified by the typecheck and build gates: if either file
were actually reachable, `pnpm typecheck` would fail in step 2 or 3.

## Done criteria

ALL must hold:

- [ ] `src/fleet/ProjectCard.tsx` does not exist
- [ ] `git grep -n "ProjectCard" -- src` returns no matches
- [ ] `grep -n "export function Meta" src/ui/primitives.tsx` returns no matches
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `git status --porcelain` lists only the two in-scope files (plus `plans/README.md`)
- [ ] `plans/README.md` status row for 002 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 or step 3 finds a real consumer — the assumption that these are dead
  is then false, and deleting would break the app.
- `pnpm typecheck` fails after a deletion in a file you did not touch.
- You find yourself wanting to edit `ProjectTable.tsx` to compensate for
  something the card was doing. It was doing nothing; that impulse means the
  premise is wrong. Stop and report.

## Maintenance notes

- `ProjectCard.tsx` was the grid renderer before the table landed. If a card
  layout is ever wanted again (a mobile-specific view, for instance), take it
  from git history rather than keeping a dead copy in the tree.
- A reviewer should confirm the diff is deletions only, with no compensating
  edits elsewhere.
