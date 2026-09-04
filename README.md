# Fleet

A cross-project overview for Sanity, built on the [App SDK](https://www.sanity.io/docs/app-sdk).
It runs in the Sanity Dashboard and answers one question across every project you can reach:
**what needs attention right now?**

A Studio is bound to one project and one dataset. Run twenty of them and nothing shows the
drafts you left unpublished last month. Fleet is read-only by design: overview, narrow down,
jump into the Studio that owns the document.

## Views

| Route | Shows |
| --- | --- |
| `#/` | Every project in one sortable table: drafts, stale, total documents, last edit |
| `#/o/<orgId>` | The same table, scoped to one organization |
| `#/p/<projectId>` | One project: dataset picker, recent activity, a link into its Studio |
| `#/drafts` | Drafts waiting to be published, in the current scope |
| `#/stale` | Documents untouched past the stale threshold, in the current scope |
| `#/search?q=…` | Documents by title, across every project at once |

The last three are what a single Studio structurally cannot do.

## Getting started

### Requirements

- **Node.js 22.12+** — the Sanity CLI's floor
- **pnpm** — pinned to `pnpm@10.15.0` via `packageManager`. npm works, but regenerates the lockfile.
- A Sanity account, and an **organization** you can deploy apps to.

### Run it

```sh
git clone https://github.com/<you>/sanity-fleet.git
cd sanity-fleet
pnpm install

cp .env.example .env      # fill it in — see below
pnpm dev
```

`pnpm dev` prints a Dashboard URL of the form
`https://www.sanity.io/@<org-id>?dev=http://localhost:3333`. **Open that, not
`localhost:3333` directly** — the app only renders inside the Dashboard, which is where it
gets its token.

Use **Chrome or Firefox**. Safari cannot load a local dev app inside the Dashboard iframe
(mixed content). Deployed builds are fine in Safari.

### Environment variables

| Variable | Required | What it is |
| --- | --- | --- |
| `SANITY_APP_ORGANIZATION_ID` | yes | The organization that owns this app. Find it in the Manage URL: `sanity.io/manage/organization/<this>` |
| `SANITY_APP_BOOTSTRAP_PROJECT_ID` | yes | Any project you can read. The SDK needs a default resource; Fleet names its own project on every query, so this one is not displayed specially |
| `SANITY_APP_BOOTSTRAP_DATASET` | no | Defaults to `production` |
| `SANITY_APP_DEPLOYMENT_ID` | no | The deployed app to update. Leave empty on a fresh fork — the first `sanity deploy` creates one and prints the id to paste here |

Two notes:

- **Keep the `SANITY_APP_` prefix.** The CLI only exposes variables with it to browser code.
  Rename them and they silently become `undefined`.
- **These are not secrets.** Organization and project IDs are public identifiers that appear
  in every browser request. `.env` keeps them out of *this repo's history*, nothing more.

CI deploys need one real secret: `SANITY_AUTH_TOKEN`, an **organization-scoped robot token
with the "Manage SDK Apps" permission**. It belongs in your CI provider's secret store.

### CORS

Every project must allow the app's origin before it will answer queries. In development, add
`http://localhost:3333` to **each project you want Fleet to read**:

```sh
pnpm exec sanity cors add http://localhost:3333 -p <projectId> --no-credentials
```

`--no-credentials` is enough — Fleet authenticates with a bearer header. Adding an origin
needs the `sanity.project.cors/create` grant on that project; without it, the project renders
an error row with a button straight to its Manage page.

**Deploying sidesteps this entirely** — the app is then served from Sanity's own origin.

### Deploying

```sh
pnpm run deploy
```

Note the `run`: `pnpm deploy` is one of pnpm's own built-in commands and shadows this script
(`pnpm start` and `pnpm test` are reserved too; `dev`, `build`, `lint` and `typecheck` are not).

Unattended, in CI:

```sh
SANITY_AUTH_TOKEN=<org robot token> pnpm exec sanity deploy --title "Fleet"
```

The token must be **organization-level** — different from the project-level tokens a Studio
deploy uses. The app then appears in your organization's Dashboard sidebar.

## How it works

**There is no federated GROQ across projects.** Every query is scoped to one project and
dataset, so a cross-project view is N queries fanned out and merged on the client. That
constraint shapes the architecture:

- **One query per project**, each in its own Suspense and error boundary. A slow project
  delays one row; a project you cannot read fails inside its own row. No global spinner,
  because that lets the slowest project decide when anyone sees anything.
- **Sorting needs the opposite.** Ordering by draft count means knowing every count before the
  first row renders, so each project publishes into a shared store
  (`src/fleet/SignalsStore.tsx`) that the table reads. Rows that have not answered sort last.

### Layout

```
src/
  App.tsx              entry — theme, fonts, SanityApp provider
  AppShell.tsx         header + navigation rail + content area
  ContentArea.tsx      scope heading and the view tabs
  routes.ts            hash routing: scope (all/org/project) × view
  fleet/               the project table, its toolbar, the signals store
  cross/               drafts, stale and search across projects
  project/             one project's detail view
  ui/                  Sidebar, DocumentList, shared primitives
  lib/                 GROQ, preferences, Studio links, formatting
```

### Checks

```sh
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint .
pnpm build        # sanity build
```

No test runner. Verification is those three plus using the app.

## Gotchas

- **Filter system documents by id, not only by type.** Excluding `sanity.*` is not enough: the
  Content Lake keeps access-control documents under an `_.` id prefix, and they otherwise
  dominate "last edited".
- **Never derive a GROQ parameter from `Date.now()` per render.** The SDK keys its query cache
  on query + parameters, so a fresh timestamp each render is a fresh key, a suspend and a
  re-render — an infinite loop. Fleet floors its stale cutoff to the UTC day.
- **Sanity UI is styled-components.** Its classes match your single-class rules on specificity
  and are injected *after* your stylesheet, so source order decides and yours loses. Double the
  class (`.nav-item.nav-item`) when you need to win.
- **Ship Inter yourself.** The theme asks for it but loads nothing, so a standalone app falls
  back to the system stack. Use `@fontsource/inter` — the variable package registers the family
  as `"Inter Variable"`, which never matches.
- **The Dashboard's token is scoped to one organization.** An app installed in organization A
  lists only A's projects, even for a user who belongs to several; to cover a second
  organization, deploy the app there too. Outside the Dashboard the app authenticates through
  the login redirect and gets a global user token instead, so a direct `localhost:3333` visit
  shows more projects than the same build shows inside the Dashboard.
- **`sanity build` drops `app.title`** from the generated `index.html`, so the browser tab
  would read "Sanity App". `src/App.tsx` sets `document.title` instead.

## Limitations

- Search matches a fixed set of title-ish fields (`title`, `name`, `label`, `heading`,
  `slug.current`). It is not Sanity's search: no relevance ranking, no full text. A document
  titled through some other field will not appear.
- Projects that are disabled or blocked are filtered out — they return `402` on every query.
- The stale threshold is a per-viewer preference in `localStorage`, not shared.

## License

[MIT](LICENSE). Fork it, deploy it to your own organization, change what you like.

Built by [Henrik Larsson](https://larssonhenrik.com).
