# Plan 008: Widen the rail and tighten the shell's horizontal padding

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat e7c2d5e..HEAD -- src/AppShell.tsx src/ContentArea.tsx`
> Note: this plan is written to be executed ON TOP of `advisor/003-vertical-rhythm`,
> which already modified `src/ContentArea.tsx`. Seeing 003's `padding={3}` on the
> `Tab` element is EXPECTED, not drift.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-verification-scripts.md, plans/003-vertical-rhythm.md
- **Category**: tech-debt
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

Two requests from the owner, which turn out to be one problem: the shell's
horizontal proportions are wrong at both ends.

The rail is 236px. Project names truncate in it — observed in the running app:
`a long project name (liv…`, `sanity-cache-compone…`,
`sanity-next-breadcrum…`. The rail's whole job is letting someone recognise a
project by name, and it is cutting the names off.

Meanwhile the content area carries 16px of horizontal padding on a surface that
is already inset inside a rounded frame, and the header repeats it. The result
reads as wasted margin next to a rail that has too little room.

Both move together, and there is one invariant that must survive: **the header's
search field and the toolbar's Refresh button share a right edge with the table
card.** That alignment was deliberate and hard-won; changing the content padding
without changing the header's would silently break it.

## Current state

### The rail width

```tsx
// src/AppShell.tsx — module scope, near the imports
const SIDEBAR_WIDTH = 236
```

Used in two places: the desktop rail's `Card` (`style={{width: SIDEBAR_WIDTH, ...}}`)
and the header's left block (`style={{width: SIDEBAR_WIDTH - 24, flex: 'none'}}`),
which is what keeps the app mark aligned over the rail beneath it.

### The header's horizontal insets

```tsx
// src/AppShell.tsx — Header()
    <Card borderBottom paddingLeft={2} paddingRight={4} paddingY={2} style={{flex: 'none'}}>
```

`paddingRight={4}` (16px) exists specifically to match the content area's
padding so the search field lands on the table card's right edge.

### The content area's padding

```tsx
// src/ContentArea.tsx — the scope header block
      <Box paddingX={4} paddingTop={4}>
```

```tsx
// src/ContentArea.tsx — the view panel block
      <Box id="view-panel" paddingX={4} paddingTop={3} paddingBottom={4}>
```

Both are `paddingX={4}` — 16px.

### Sanity UI space scale

step 1 = 4px, 2 = 8px, 3 = 12px, 4 = 16px, 5 = 24px.

### Conventions

Sanity UI `padding*` props, not CSS, for component spacing. `src/global.css` is
reserved for what the component layer cannot express.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |

## Scope

**In scope**:
- `src/AppShell.tsx` — the `SIDEBAR_WIDTH` constant and the header's `paddingRight`
- `src/ContentArea.tsx` — the two `paddingX` values

**Out of scope** (do NOT touch):
- `src/ui/Sidebar.tsx` — a separate plan (004) is editing this file concurrently.
  Touching it will cause a merge conflict. The rail's internal padding is fine;
  only its container width changes here.
- `src/global.css` and anything in `.fleet-table` — the table's own cell padding
  is correct and is the reference the toolbar aligns against.
- The mobile branch (`isMobile ? 0 : 2` on the outer `Box`, the overlay width
  `min(84vw, 300px)`). The rail overlays the content on a phone, so its desktop
  width is irrelevant there. Leave it alone.
- The header's `paddingLeft={2}` — it aligns the app mark with the rail's icons
  and is correct.

## Git workflow

- Branch: `advisor/008-shell-proportions`
- One commit. Conventional commits, lowercase summary (see `git log`).
  Use: `fix: widen the rail and tighten the shell's horizontal padding`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Widen the rail

In `src/AppShell.tsx`, change the constant:

```tsx
const SIDEBAR_WIDTH = 280
```

Do not touch either of its two usages — the header's `SIDEBAR_WIDTH - 24`
expression must keep deriving from it, which is what keeps the mark aligned.

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Tighten the content padding

In `src/ContentArea.tsx`, change **both** `paddingX={4}` to `paddingX={3}`:
the scope-header `Box` and the `id="view-panel"` `Box`. Leave `paddingTop` and
`paddingBottom` on both exactly as they are.

**Verify**: `pnpm typecheck` → exits 0.

### Step 3: Keep the header's right edge in step

In `src/AppShell.tsx`'s `Header()`, change `paddingRight={4}` to
`paddingRight={3}`.

This is not cosmetic symmetry — it preserves the invariant named in "Why this
matters". The header's right inset must equal the content's horizontal padding,
or the search field stops aligning with the table beneath it.

Update the existing comment above the `return` so it still describes what is
true (it currently explains the borrowed insets; keep that explanation accurate).

**Verify**: `pnpm typecheck` → exits 0, `pnpm lint` → exits 0, `pnpm build` → exits 0.

### Step 4: Report the numbers for the reviewer to check

You probably cannot drive a browser in this session. Do NOT fabricate
measurements. Instead, state in your NOTES the exact final values of all four
changed numbers so the reviewer can verify against the running app:

- `SIDEBAR_WIDTH`
- header `paddingRight`
- both `paddingX` values in `ContentArea.tsx`

If you CAN drive a browser and a dev server is available, the reviewer's check
is: the search input's right edge, the Refresh button's right edge, and the
table card's right edge must all be within 1px of each other.

## Test plan

No test runner exists in this repo. Verification is the typecheck/lint/build
gates plus the reviewer's browser measurement of the alignment invariant.

## Done criteria

ALL must hold:

- [ ] `grep -n "SIDEBAR_WIDTH = 280" src/AppShell.tsx` returns a match
- [ ] `grep -c "paddingX={4}" src/ContentArea.tsx` returns 0
- [ ] `grep -n "paddingRight={3}" src/AppShell.tsx` returns a match
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] `git status --porcelain` lists only the two in-scope files
- [ ] `src/ui/Sidebar.tsx` is NOT modified (`git diff --name-only` must not list it)

## STOP conditions

Stop and report back (do not improvise) if:

- `src/ui/Sidebar.tsx` appears in your diff for any reason. A concurrent plan
  owns that file.
- Widening the rail to 280 makes the table overflow horizontally at a normal
  desktop width. The table has its own `overflow-x: auto` wrapper so it should
  scroll rather than break the page; if the whole page scrolls sideways instead,
  report it.
- You find yourself wanting to change the mobile overlay width to match.
  Out of scope.

## Maintenance notes

- The alignment invariant — header `paddingRight` equals `ContentArea`'s
  `paddingX` — is load-bearing and easy to break by changing one without the
  other. It is worth a comment at both sites; make sure the header's existing
  comment still says so after your edit.
- 280px was chosen to clear the longest observed project name
  (`the longest project name`) at 13px Inter, including the rail's
  indent and its hover action button. If project names get longer, the rail
  truncates again rather than growing — that is intended; the alternative is a
  rail that resizes itself.
