# Plan 009: Use Sanity UI's `selected` state for the active rail row

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Skip updating
> `plans/README.md` if a reviewer told you they maintain it.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/006-rail-signals.md (execute on top of `advisor/006-rail-signals`)
- **Category**: tech-debt
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

The active row in the rail is styled with Sanity UI's `pressed` prop, which
renders a muted tint (measured: `rgb(22, 24, 48)` on the dark scheme). Sanity
Studio's own active navigation item is a solid filled row — a different visual
state entirely, and the one users of Studio already recognise as "you are here".

`Card` exposes both props. We picked the wrong one:

```
// node_modules/@sanity/ui/dist/index.d.ts — CardOwnProps
  disabled?: boolean;
  muted?: boolean;
  pressed?: boolean;     ← what the rail uses today
  scheme?: ThemeColorSchemeKey;
  selected?: boolean;    ← the filled active state
  tone?: CardTone;
```

This is a one-prop change plus a decision about whether `tone` is still needed.

## Current state

`src/ui/Sidebar.tsx`, inside `NavItem` — the row's wrapping `Card`:

```tsx
    <Card
      padding={0}
      radius={2}
      tone={selected ? 'primary' : 'default'}
      pressed={selected}
      className="nav-item"
      style={{background: selected ? undefined : 'transparent'}}
    >
```

Three things interact here and all three matter:

1. `tone="primary"` when selected — sets the colour family.
2. `pressed={selected}` — the state to replace.
3. The inline `style` forces a transparent background when NOT selected, so
   unselected rows do not paint a card surface over the rail.

`.nav-item` also carries `min-height: 36px` from `src/global.css`; that rule is
unrelated and must keep working.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |

## Scope

**In scope**: `src/ui/Sidebar.tsx` — the `Card` in `NavItem` only.

**Out of scope** (do NOT touch):
- `src/global.css` — do not hand-write colours to imitate the state. The whole
  point is to use the theme's own token so it tracks light/dark and any future
  theme change. If `selected` alone does not look right, that is a STOP
  condition, not a licence to write CSS.
- The `draftBadge` / `aria-current` / `aria-expanded` logic added by earlier
  plans. Leave every other prop on `NavItem` alone.
- `ProjectTable`'s row styling. The table has its own hover/selection language.

## Git workflow

- Branch: `advisor/009-rail-selected-state`, created from `advisor/006-rail-signals`
- One commit: `fix: use Sanity UI's selected state for the active rail row`
- Do NOT push or open a PR.

## Steps

### Step 1: Swap the prop

In `src/ui/Sidebar.tsx`, in `NavItem`'s `Card`, replace `pressed={selected}`
with `selected={selected}`. Change nothing else on that element yet.

**Verify**: `pnpm typecheck` → exits 0.

### Step 2: Decide whether `tone` is still needed

With `selected` driving the fill, `tone="primary"` may be redundant or may be
what supplies the colour. Do NOT guess — the reviewer will look at both.

Leave `tone={selected ? 'primary' : 'default'}` in place for now, and note in
your report that the reviewer should compare it against the same row with the
`tone` prop removed. That comparison needs a browser; you almost certainly
cannot make it.

**Verify**: `pnpm lint` → exits 0, `pnpm build` → exits 0.

### Step 3: Confirm the transparent-when-unselected rule still applies

The inline `style={{background: selected ? undefined : 'transparent'}}` must
stay. Without it, every unselected row paints a card surface and the rail turns
into a stack of boxes.

**Verify**: read the final `Card` element and confirm the `style` prop is
unchanged. Paste it into your report.

## Test plan

No test runner. Verification is the three gates plus the reviewer's visual
comparison against Sanity Studio's own active nav item.

## Done criteria

- [ ] `grep -n "pressed={selected}" src/ui/Sidebar.tsx` returns no matches
- [ ] `grep -n "selected={selected}" src/ui/Sidebar.tsx` returns a match
- [ ] The `style={{background: selected ? undefined : 'transparent'}}` prop is intact
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` all exit 0
- [ ] `git status --porcelain` lists only `src/ui/Sidebar.tsx`

## STOP conditions

- `selected` is not accepted by `Card` at typecheck (it should be — it is in
  `CardOwnProps`). If rejected, report the exact error.
- You are tempted to add CSS to produce the colour. Stop; the theme owns it.

## Maintenance notes

- `pressed` and `selected` are different states in Sanity UI and easy to
  confuse. `pressed` is for toggle-like controls; `selected` is for "this is the
  current item in a list". The rail is the latter.
- The reviewer must check both colour schemes if the app ever gains a light
  theme — that is precisely what using the token rather than a hex value buys.
