# Plan 003: Put the rail, the tabs and the table on one vertical rhythm

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7c2d5e..HEAD -- src/ui/Sidebar.tsx src/ContentArea.tsx src/global.css`
> If any of those changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-verification-scripts.md
- **Category**: tech-debt
- **Planned at**: commit `e7c2d5e`, 2026-09-04

## Why this matters

Measured in the running app at commit `e7c2d5e`: a navigation row in the rail
is **25px** tall, a view tab is **25px**, and a table row is **44px**. Three
surfaces, three densities, no relationship between them. The rail is also the
primary navigation on a phone, where it becomes a full-height overlay — and a
25px target is below every touch-target guideline worth citing (WCAG 2.2's
minimum is 24px; Apple and Material both ask for 44px). The rail reads cramped
against the content it navigates, and on touch it is genuinely hard to hit.

After this plan, a rail row and a tab are both **36px**, half of the table's
44px row plus its border — one rhythm, and a comfortable target everywhere.

## Current state

### The rail row

`src/ui/Sidebar.tsx` renders every row through one `NavItem` component. Its
height comes from three separate `paddingY={2}` values (Sanity UI space step
2 = 8px) around 19px-line-height text:

```tsx
// src/ui/Sidebar.tsx — the icon slot (approx. lines 172-198)
          <Box
            as={onIconClick ? 'button' : 'div'}
            ...
            paddingLeft={2}
            paddingRight={1}
            paddingY={2}
```

```tsx
// src/ui/Sidebar.tsx — the label button (approx. lines 205-217)
        <Box
          as="button"
          flex={1}
          onClick={onClick}
          paddingY={2}
          paddingLeft={icon ? 1 : indented ? 5 : 3}
          paddingRight={action ? 1 : 2}
```

```tsx
// src/ui/Sidebar.tsx — the hover action slot (approx. lines 240-252)
          <Box
            as="button"
            onClick={action.onClick}
            ...
            paddingX={2}
            paddingY={2}
```

Three padded children inside one `Flex`; the tallest sets the row height.
Raising padding on only one of them changes the row height but leaves the other
two hit-areas short, so the fix must set a height on the row and let the
children fill it.

### The tabs

`src/ContentArea.tsx:61-72` — Sanity UI `Tab`s at their default size:

```tsx
          <TabList gap={1}>
            {VIEWS.map((view) => (
              <Tab
                key={view.id}
                id={`view-${view.id}`}
                aria-controls="view-panel"
                label={view.label}
                selected={route.view === view.id}
                onClick={() => navigate({scope: route.scope, view: view.id})}
              />
            ))}
          </TabList>
```

### Conventions to follow

- **Sanity UI props before CSS.** The repo styles with `@sanity/ui` components
  and their `padding`/`gap`/`radius` props; raw CSS lives in
  `src/global.css` and is reserved for what the component layer cannot express
  (the table, the document element, hover affordances). Follow that split: use
  the `padding` props where they suffice, and add CSS only for the height rule.
- **CSS goes in `src/global.css`, commented.** Every rule block in that file
  opens with a comment explaining *why* it exists, not what it does. Match that.
  Example to model:

```css
/*
 * A rail item's secondary action (hide/show) stays out of the way until the
 * row is hovered or the button itself is focused — visible enough to discover,
 * quiet enough that twenty rows do not read as twenty buttons.
 */
.nav-item__action {
  opacity: 0;
  transition: opacity 120ms ease;
}
```

- **Sanity UI space scale**: step 1 = 4px, 2 = 8px, 3 = 12px, 4 = 16px, 5 = 24px.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Typecheck | `pnpm typecheck` | exit 0, no output   |
| Lint      | `pnpm lint`      | exit 0, no output   |
| Build     | `pnpm build`     | exit 0              |
| Dev server| `pnpm dev`       | "Dev server started on port 3333" |

## Scope

**In scope**:
- `src/global.css` (add one rule block)
- `src/ui/Sidebar.tsx` (the `NavItem` component only)
- `src/ContentArea.tsx` (the `TabList` block only)

**Out of scope** (do NOT touch, even though they look related):
- `.fleet-table` rules in `src/global.css` — the 44px row is the reference this
  plan aligns *to*, not something to change.
- The `Sidebar` component's group/`Stack` structure — spacing *between* groups
  is deliberate and separate from row height.
- `src/AppShell.tsx` — the rail's width and the mobile overlay are not part of
  this change.
- Colours, tones, typography. This plan changes vertical rhythm only.

## Git workflow

- Branch: `advisor/003-vertical-rhythm`
- Commit per step is fine, or one commit for the lot. Conventional commits,
  lowercase summary (see `git log`).
  Use: `fix: put the rail, tabs and table on one vertical rhythm`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Give the rail row a minimum height

Add to `src/global.css` (append at the end of the file, with a comment in the
house style):

```css
/*
 * A rail row matches half a table row: one rhythm across the app, and a target
 * big enough to hit on the phone, where this rail is the whole navigation. The
 * height sits on the row rather than on its padding because the row has three
 * padded children — icon, label, hover action — and only a shared height makes
 * all three fill it.
 */
.nav-item {
  min-height: 36px;
}

.nav-item > * {
  min-height: inherit;
}
```

**Verify**: `pnpm build` → exits 0.

### Step 2: Make the row's children fill that height

In `src/ui/Sidebar.tsx`, inside `NavItem`, the three padded `Box` children each
need to stretch and centre their content rather than sit at their own intrinsic
height. For each of the three (the icon slot, the label button, the action
slot), add to its existing inline `style` object:

```
display: 'flex',
alignItems: 'center',
```

Do not change their `padding*` props — those set the horizontal rhythm and the
label's indent, both of which are correct.

**Verify**: `pnpm typecheck` → exits 0, and `pnpm lint` → exits 0.

### Step 3: Match the tabs to the same height

In `src/ContentArea.tsx`, the `TabList` block quoted in "Current state": give
each `Tab` explicit padding so it lands on 36px. Add `padding={3}` to the `Tab`
element (Sanity UI space step 3 = 12px, which with the 19px line height and the
component's own border gives ~36px).

**Verify**: `pnpm typecheck` → exits 0.

### Step 4: Measure the result in the browser

Start the dev server with `pnpm dev` and open the URL it prints. In the
browser console run:

```js
JSON.stringify({
  nav: Math.round(document.querySelector('.nav-item').getBoundingClientRect().height),
  tab: Math.round([...document.querySelectorAll('button')]
    .find(b => b.innerText.trim() === 'Overview').getBoundingClientRect().height),
  row: Math.round(document.querySelector('.fleet-table tbody tr').getBoundingClientRect().height),
})
```

**Verify**: output shows `nav` and `tab` both **36** (±1), and `row` still
**44** (±1). If `nav` is still 25, step 2 did not take effect — the children
are not stretching.

## Test plan

No test runner exists in this repo. Verification is the browser measurement in
step 4 plus the typecheck/lint/build gates. Record the three measured numbers
in your report so a reviewer can confirm without re-running.

## Done criteria

ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] Browser measurement from step 4 shows nav = 36 (±1), tab = 36 (±1), row = 44 (±1)
- [ ] `git status --porcelain` lists only the three in-scope files (plus `plans/README.md`)
- [ ] `plans/README.md` status row for 003 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- The rail rows stop aligning with each other — e.g. the label sits off-centre
  against the icon. That means a child is stretching without centring; fix the
  `alignItems`, and if it persists, report rather than adding margins.
- Raising the row height makes the rail overflow its container on a laptop-height
  viewport in a way that clips content rather than scrolling. The rail is
  already `overflowY: 'auto'` in `AppShell.tsx`, so it should scroll; if it
  clips instead, that is a container bug outside this plan's scope.
- `Tab` rejects the `padding` prop at typecheck. Sanity UI v4's `Tab` may not
  expose it; in that case STOP and report rather than reaching for CSS on a
  component whose internals this plan has not inspected.

## Maintenance notes

- The 36px figure is deliberately half of the table's 44px row plus its border.
  If the table's row padding changes (`.fleet-table th, .fleet-table td` in
  `src/global.css`), revisit this number rather than letting the two drift.
- Plan 004 also edits `NavItem` (adding ARIA state). If both are executed,
  land 003 first: it changes structure, 004 changes attributes.
- A reviewer should check the phone layout too — the rail becomes a full-height
  overlay below 900px, which is where the touch-target argument actually bites.
