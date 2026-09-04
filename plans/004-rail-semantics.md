# Plan 004: Make the rail navigable by keyboard and screen reader

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7c2d5e..HEAD -- src/ui/Sidebar.tsx src/AppShell.tsx`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/003-vertical-rhythm.md (both edit `NavItem`; land 003 first)
- **Category**: tech-debt
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

`src/ui/Sidebar.tsx` is 266 lines and contains exactly one accessibility
attribute — the `aria-label` on the hide button. The rail is the app's primary
navigation and it currently reaches assistive technology as an unlabelled pile
of buttons: no landmark to jump to, no indication of which project is open, no
indication that an organization row expands. Selection is conveyed by
background colour alone, which is also the one channel unavailable to a screen
reader and the first to fail for a colour-blind user.

Everything here is attributes on markup that already exists. No layout changes.

## Current state

### The rail's root

```tsx
// src/ui/Sidebar.tsx — Sidebar() return, approx. line 55
  return (
    <Stack gap={4} paddingY={3} paddingX={2}>
      <NavItem
        icon={<ThLargeIcon />}
        label="All projects"
        selected={route.scope.kind === 'all'}
        onClick={() => navigate({scope: {kind: 'all'}, view: route.view})}
      />
```

`Stack` renders a plain `div`. There is no `<nav>` anywhere in the app —
verified with `git grep -n "<nav" -- src`, which returns nothing.

### The organization row — two behaviours, no announcement

```tsx
// src/ui/Sidebar.tsx — inside organizations.map(), approx. lines 66-80
        const expanded = expandedOrgs.includes(org.id)

        return (
          <Stack key={org.id} gap={1}>
            <NavItem
              icon={expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
              label={org.name}
              badge={String(org.projects.length)}
              selected={activeOrgId === org.id}
              onIconClick={() => onToggleOrg(org.id)}
              onClick={() => {
                if (!expanded) onToggleOrg(org.id)
                navigate({scope: {kind: 'organization', id: org.id}, view: route.view})
              }}
            />
```

Two controls on one row: the chevron toggles the fold; the label navigates to
the organization *and* expands it if collapsed. Neither announces what it does.
The chevron is a `<button>` with no accessible name at all.

### The NavItem's two/three controls

```tsx
// src/ui/Sidebar.tsx — NavItem, the label button, approx. line 205
        <Box
          as="button"
          flex={1}
          onClick={onClick}
          paddingY={2}
```

No `aria-current`. The `selected` prop drives only `tone` and `pressed` on the
wrapping `Card`.

### Conventions to follow

- Sanity UI components with props; inline `style` only for what props cannot
  express. Keep that.
- Comments in this repo explain *why* a thing is done, not what the code says.
  Match that voice — see the file header of `src/ui/Sidebar.tsx`.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |
| Dev server| `pnpm dev`       | "Dev server started on port 3333" |

## Scope

**In scope**:
- `src/ui/Sidebar.tsx`

**Out of scope** (do NOT touch, even though they look related):
- `src/AppShell.tsx` — the rail's container, the mobile overlay and its
  open/close button. The overlay's focus management is a real concern but a
  separate, larger piece of work; do not start it here.
- `src/ContentArea.tsx` — the view tabs already carry `aria-controls`.
- Any change to how navigation *works*. This plan describes the existing
  behaviour to assistive technology; it does not redesign the interaction.
  In particular, do NOT split the organization row into two rows or remove the
  navigate-and-expand behaviour — see plan 006's maintenance note.

## Git workflow

- Branch: `advisor/004-rail-semantics`
- One commit. Conventional commits, lowercase summary (see `git log`).
  Use: `fix: give the rail a landmark and announce its state`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Give the rail a landmark and a name

In `Sidebar()`, wrap the returned `Stack` in a `<nav>` with an accessible name:

```tsx
  return (
    <nav aria-label="Projects">
      <Stack gap={4} paddingY={3} paddingX={2}>
        ...unchanged...
      </Stack>
    </nav>
  )
```

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Announce the current page

`NavItem` receives `selected`. Pass it through to the label button as
`aria-current`:

- Add `aria-current={selected ? 'page' : undefined}` to the label `Box as="button"`.

`aria-current="page"` is the correct token here: each rail row navigates to a
distinct view of the app, and the routes are real (hash) URLs.

**Verify**: `pnpm typecheck` → exits 0.

### Step 3: Name and describe the fold control

The chevron button (`onIconClick`) has no accessible name and does not announce
that it controls a list. `NavItem` needs two more optional props to describe it
without hardcoding organization vocabulary into a generic component:

- `iconLabel?: string` — the accessible name for the icon button.
- `expanded?: boolean` — when provided, set `aria-expanded={expanded}` on the
  icon button.

Apply both to the icon `Box` when `onIconClick` is set:

```tsx
            aria-label={onIconClick ? iconLabel : undefined}
            aria-expanded={onIconClick && expanded !== undefined ? expanded : undefined}
```

Then in the organizations map, pass them:

```tsx
              iconLabel={expanded ? `Collapse ${org.name}` : `Expand ${org.name}`}
              expanded={expanded}
```

**Verify**: `pnpm typecheck` → exits 0.

### Step 4: Label the two remaining unnamed rows

The "Hidden" row toggles a disclosure the same way an organization does. Give
it the same treatment where it is rendered (the `hidden.length > 0` block):
pass `expanded={showHidden}` and an `iconLabel` of
`showHidden ? 'Hide hidden projects' : 'Show hidden projects'`.

Note this row's icon has no `onIconClick` — the whole row toggles. In that case
`aria-expanded` belongs on the **label button**, not the icon. Add to `NavItem`:
when `expanded !== undefined` and `onIconClick` is NOT set, put
`aria-expanded={expanded}` on the label button instead.

**Verify**: `pnpm typecheck` → exits 0; `pnpm lint` → exits 0.

### Step 5: Check it in the browser

Start `pnpm dev`, open the printed URL, and run in the console:

```js
const nav = document.querySelector('nav[aria-label="Projects"]');
JSON.stringify({
  landmark: !!nav,
  current: nav.querySelectorAll('[aria-current="page"]').length,
  expandable: nav.querySelectorAll('[aria-expanded]').length,
  unnamedButtons: [...nav.querySelectorAll('button')]
    .filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
})
```

**Verify**: `landmark` is `true`; `current` is `1`; `expandable` is at least
`2` (two organizations); `unnamedButtons` is `0`.

## Test plan

No test runner exists in this repo. Verification is the browser assertion in
step 5 — it is a genuine check, not a judgement call: it counts landmarks,
current-page markers and unnamed buttons. Paste its output into your report.

## Done criteria

ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `git grep -c "aria-" src/ui/Sidebar.tsx` returns at least 6
- [ ] Step 5 output: `landmark: true`, `current: 1`, `unnamedButtons: 0`
- [ ] `git status --porcelain` lists only `src/ui/Sidebar.tsx` (plus `plans/README.md`)
- [ ] `plans/README.md` status row for 004 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `current` in step 5 is greater than 1. More than one row claiming to be the
  current page means `selected` is true in two places, which is a routing bug
  worth reporting rather than papering over.
- You find yourself changing what a click does in order to make the semantics
  fit. The markup should describe the behaviour, not the reverse.
- The mobile overlay's focus handling starts looking necessary to finish this.
  It is out of scope; note it and stop.

## Maintenance notes

- The organization row's dual behaviour (label navigates and expands, chevron
  only expands) is now *described* but not resolved. If it proves confusing in
  use, the fix is a design decision — most likely making the chevron the only
  fold control — and should be taken deliberately, not as a side effect.
- The mobile rail overlay (`src/AppShell.tsx`) does not trap focus or return it
  to the toggle on close. That is the largest remaining accessibility gap in the
  app and deserves its own plan.
- A reviewer should tab through the rail with the keyboard: every stop should
  have a visible focus ring (`.nav-item button:focus-visible` already exists in
  `src/global.css`) and an announced name.
