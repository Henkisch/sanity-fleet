# Fleet

A cross-project overview for Sanity, built with the [App SDK](https://www.sanity.io/docs/app-sdk).
It runs in the Sanity Dashboard and answers one question across every project you can reach:
**what needs attention right now?**

A Studio is bound to one project and one dataset. If you run twenty of them, there is no single
place that shows the drafts you left unpublished last month. Fleet is that place. It is
read-only by design: broad overview → narrow down → jump into the Studio that owns the
document. Nothing is edited here.

## Views

| Route | What it shows |
| --- | --- |
| `#/` | Every project you can reach, in one sortable table — drafts waiting, stale documents, total documents, last edit |
| `#/o/<orgId>` | The same table, scoped to one organization |
| `#/p/<projectId>` | One project: dataset picker, recent activity, a link into its Studio |
| `#/drafts` | Drafts waiting to be published, across the current scope |
| `#/stale` | Documents untouched past the stale threshold, across the current scope |
| `#/search?q=…` | Find documents by title across every project at once |

The last three are the ones a Studio structurally cannot do.

---

## Getting started

### Requirements

- **Node.js 22.12+** (the App SDK's floor)
- **pnpm** — the repo pins `pnpm@10.15.0` via `packageManager`. npm works, but you will
  regenerate the lockfile; pnpm also installs this tree in seconds rather than minutes,
  because the Sanity CLI pulls in the full Studio.
- A Sanity account, and an **organization** you can deploy apps to.

### Fork and run

```sh
git clone https://github.com/<you>/sanity-fleet.git
cd sanity-fleet
pnpm install

cp .env.example .env      # then fill it in — see below
pnpm dev
```

`pnpm dev` prints a Dashboard URL of the form
`https://www.sanity.io/@<org-id>?dev=http://localhost:3333`. **Open that URL, not
`localhost:3333` directly** — the app only renders inside the Dashboard, which is where it
gets its authentication.

Use **Chrome or Firefox**. Safari cannot load a local dev app inside the Dashboard iframe
(mixed content); that is a platform limitation, not a bug here. Deployed builds are fine in
Safari.

### Environment variables

Copy `.env.example` to `.env` and fill in two values:

| Variable | Required | What it is |
| --- | --- | --- |
| `SANITY_APP_ORGANIZATION_ID` | yes | The organization that owns this app. Read by `sanity.cli.ts` at dev/build/deploy time. Find it in the Manage URL: `sanity.io/manage/organization/<this>` |
| `SANITY_APP_BOOTSTRAP_PROJECT_ID` | yes | Any project you can read. The SDK needs a default resource; Fleet names its own project on every query, so this one is not displayed specially |
| `SANITY_APP_BOOTSTRAP_DATASET` | no | Defaults to `production` |
| `SANITY_APP_DEPLOYMENT_ID` | no | The deployed app to update. Leave empty on a fresh fork — the first `sanity deploy` creates one and prints the id to paste here. Without it, every deploy asks whether to create or reuse |

Two things worth being precise about:

- **The `SANITY_APP_` prefix is required.** The Sanity CLI only exposes variables with that
  prefix to browser code. Rename them and they silently become `undefined`.
- **These are not secrets.** Sanity organization and project IDs are public identifiers —
  they appear in every deployed Studio's client bundle and in requests from the browser.
  They live in a git-ignored `.env` to keep them out of *this repo's history*, not to keep
  them confidential. Do not treat `.env` here as a credential store.

There is one real secret in this project's lifecycle, and it is only needed for CI:
`SANITY_AUTH_TOKEN`, an **organization-scoped robot token with the "Manage SDK Apps"
permission**. It belongs in your CI provider's secret store and nowhere else.

### CORS — the part that will bite you

Every Sanity project must allow the origin the app runs on before it will answer queries.
In development that means adding `http://localhost:3333` to **each project you want Fleet to
read**:

```sh
pnpm exec sanity cors add http://localhost:3333 -p <projectId> --no-credentials
```

Fleet authenticates with a bearer token in a header, so `--no-credentials` is sufficient.

Two notes:

- Adding the origin requires the `sanity.project.cors/create` grant on that project. If you
  are a plain member somewhere, you cannot add it and that project will show an error row.
- Fleet turns a CORS failure into a one-click fix: the row renders an **"Allow this origin"**
  button linking straight to that project's Manage page.

**Deploying sidesteps all of this** — the app is then served from Sanity's own origin, so no
per-project CORS is needed.

### Deploying

```sh
pnpm deploy       # interactive, if you're an org admin/developer
```

or unattended, in CI:

```sh
SANITY_AUTH_TOKEN=<org robot token> pnpm exec sanity deploy --title "Fleet"
```

The app then appears in your organization's Dashboard sidebar. Deployment needs an
**organization-level** token — different from the project-level tokens a Studio deploy uses.

---

## How it works

**There is no federated GROQ across projects.** Every query is scoped to one project and
dataset, so a cross-project view is N queries fanned out and merged on the client. That single
constraint shapes the architecture:

- **One query per project, each in its own Suspense and error boundary.** A slow project
  degrades one row. A project you cannot read fails inside its own row. There is no global
  spinner, because a global spinner lets the slowest project decide when anyone sees anything.
- **Sorting needs the opposite.** Ordering rows by draft count means knowing every project's
  count before the first row renders. So each project still fetches independently but
  publishes into a shared store (`src/fleet/SignalsStore.tsx`) that the table reads; rows that
  have not answered yet sort last.

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

There is no test runner. Verification is the three commands above plus using the app.

---

## Things worth knowing before you extend it

- **Do not use `/v1/data/stats/<dataset>` for quota bars.** Its document limit was measured
  100× off against a real project quota — the quota is project-wide, the endpoint is
  per-dataset. Only *attributes* is trustworthy. Fleet reports content signals from GROQ
  instead, so every number can be checked against the Studio.
- **Filter system documents properly.** Excluding `sanity.*` types is not enough; the Content
  Lake keeps access-control documents under an `_.` id prefix, and they will otherwise show up
  as your most recently edited content.
- **Never derive a GROQ parameter from `Date.now()` per render.** The SDK keys its query cache
  on query + parameters, so a fresh timestamp each render means a fresh key, a suspend, a
  re-render, and an infinite loop. Fleet floors its stale cutoff to the UTC day.
- **Sanity UI is styled-components.** Its generated classes have the same specificity as your
  single-class CSS rules and are injected *after* your stylesheet, so source order decides and
  your rule loses. Double the class (`.nav-item.nav-item`) when you need to win.
- **Ship Inter yourself.** The theme asks for it, but a standalone app has to load it or
  everything silently falls back to the system stack. Use `@fontsource/inter`, not the
  variable package — that one registers the family as `"Inter Variable"`, which never matches.
- **The Dashboard's token is scoped to one organization.** An app installed in
  organization A lists organization A's projects, even for a user who belongs to
  several. Opened outside the Dashboard the app authenticates through the login
  redirect instead and gets a global user token, which *does* span organizations
  — so a direct `localhost:3333` visit shows more projects than the same build
  shows inside the Dashboard. Verified by loading one dev server both ways.
  To cover a second organization, deploy the app there too and switch
  organizations in the Dashboard.

## Limitations

- Document search matches a fixed set of title-ish fields (`title`, `name`, `label`,
  `heading`, `slug.current`). It is not Sanity's search: no relevance ranking, no full text.
  A document titled through some other field will not appear.
- Projects that are disabled or blocked are filtered out — they return `402` on every query.
- The stale threshold is a per-viewer preference stored in `localStorage`, not shared.
