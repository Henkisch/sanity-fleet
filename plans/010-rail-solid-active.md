# Plan 010: Give the active rail row Sanity's solid primary fill

> **Executor instructions**: Follow each step and run every verification
> command. If a STOP condition occurs, stop and report. Skip updating
> `plans/README.md` if a reviewer told you they maintain it.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/009-rail-selected-state.md (build on `advisor/009-rail-selected-state`)
- **Category**: tech-debt
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

The active rail row renders as a muted navy (`#161830`). The target — Sanity's
own active navigation item — is a **solid** primary fill with dark text.

Plan 009 already swapped `pressed` for `selected`, which is the semantically
correct prop, but produced no visual change: Sanity UI's `Card` renders
`tone="primary" + selected` as a dark *surface* in the dark scheme. Solid fills
live in a different part of the theme, and no boolean on `Card` reaches them.

This was verified in the browser by applying the candidate token to the live
row and comparing against the reference: `#6279fd` is the match.

## Current state

`src/ui/Sidebar.tsx`, `NavItem`'s wrapping `Card` (after plan 009):

```tsx
    <Card
      padding={0}
      radius={2}
      tone={selected ? 'primary' : 'default'}
      selected={selected}
      className="nav-item"
      style={{background: selected ? undefined : 'transparent'}}
    >
```

`src/global.css` already owns the row's height, with a comment explaining why
its selector is doubled:

```css
.nav-item.nav-item {
  min-height: 36px;
}
```

**The token.** Sanity UI exposes its solid primary colour on the card as the CSS
custom property `--card-badge-primary-dot-color`, which resolves to `#6279fd`
in the dark scheme. Measured on the running app. Using the custom property —
not the literal hex — is the whole point: it follows the theme, including a
future light scheme, where a hardcoded value would not.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |

## Scope

**In scope**:
- `src/global.css` — one rule block
- `src/ui/Sidebar.tsx` — only if the `Card`'s inline `style` fights the CSS

**Out of scope**:
- The `tone` / `selected` props from plan 009. Leave both exactly as they are:
  `selected` is semantically right and `tone` still colours the text.
- Any other `.nav-item` rule, especially the `min-height` block.
- The table's row styling, and the `.nav-item__action` hover rule.
- Hardcoding `#6279fd` anywhere. Use the custom property, with the hex only as
  a fallback value inside `var(...)`.

## Git workflow

- Branch: `advisor/010-rail-solid-active`, from `advisor/009-rail-selected-state`
- One commit: `fix: give the active rail row Sanity's solid primary fill`
- Do NOT push or open a PR.

## Steps

### Step 1: Add the rule

Append to `src/global.css`, in the file's house comment style (explain *why*,
as the surrounding blocks do):

```css
/*
 * The active row takes Sanity's solid primary fill, matching the Dashboard's
 * own active navigation item. Sanity UI's Card renders `selected` as a dark
 * surface in the dark scheme — surfaces stay dark — so the solid colour has to
 * come from the theme's own custom property rather than from a Card prop. The
 * selector is doubled for the same reason as the height rule above: styled-
 * components injects after this file and would otherwise win on source order.
 */
.nav-item.nav-item[data-selected='true'] {
  background: var(--card-badge-primary-dot-color, #6279fd);
}

.nav-item.nav-item[data-selected='true'] * {
  color: var(--card-bg-color, #13141b);
}
```

### Step 2: Mark the selected row in the DOM

The CSS above needs a hook. In `src/ui/Sidebar.tsx`, add to `NavItem`'s `Card`:

```tsx
      data-selected={selected ? 'true' : undefined}
```

Keep every existing prop. Do not remove `selected={selected}` or `tone`.

**Verify**: `pnpm typecheck` → exits 0.

### Step 3: Check the inline style does not fight it

The `Card` carries `style={{background: selected ? undefined : 'transparent'}}`.
When selected, `background` is `undefined`, so the inline style sets nothing and
the CSS rule wins. Confirm that is still the case after your edit — if the
inline style ever sets a background for the selected case, the CSS cannot apply.

**Verify**: `pnpm lint` → exits 0, `pnpm build` → exits 0.

## Test plan

No test runner. The reviewer will confirm in the browser that the active row is
`rgb(98, 121, 253)` with dark text, that inactive rows are unchanged, and that
the hidden-projects rows and org rows still read correctly when active.

## Done criteria

- [ ] `grep -n "data-selected" src/ui/Sidebar.tsx` returns a match
- [ ] `grep -n "card-badge-primary-dot-color" src/global.css` returns a match
- [ ] No literal `#6279fd` outside a `var(...)` fallback
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` all exit 0
- [ ] `git status --porcelain` lists only the two in-scope files

## STOP conditions

- The active row does not change colour. That means the doubled selector still
  lost, or `data-selected` is not reaching the DOM — report rather than adding
  `!important`.
- You find yourself needing `!important`. Stop; that signals the selector is
  wrong, and a future reader will not know why it is there.

## Maintenance notes

- Text colour is forced to the card background token so it reads on the fill.
  If a light scheme is ever added, check this pairing — that is exactly the case
  a hardcoded hex would have broken.
- Icons inherit `color`, so the descendant rule covers them; the draft-count
  badge on an active row will also invert, which is intended.
