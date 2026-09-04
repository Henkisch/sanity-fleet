# Fleet

A cross-project overview for Sanity, built with the [App SDK](https://www.sanity.io/docs/app-sdk).
It runs in the Sanity Dashboard and answers one question across every project you can reach:
**what needs attention right now?**

Fleet is read-only. Broad overview → narrow down → jump out into the Studio that owns the
document. Nothing is edited here.

## Views

| Route | What it shows |
| --- | --- |
| `#/` | Fleet grid: one card per project, grouped by organization — drafts waiting, stale count, total documents, last edit |
| `#/p/<projectId>` | One project: dataset picker, and Recent / Drafts / Stale lists |
| `#/drafts` | Drafts waiting to be published, every project |
| `#/stale` | Documents untouched past the stale threshold, every project |
| `#/search?q=…` | Search across every project at once |

Studios cannot do the last three: a Studio is bound to one project and one dataset.

## Setup

Copy `.env.example` to `.env` and fill in the two ids: the Sanity organization that owns this
app, and a project to use as the SDK's bootstrap resource (any project you can read works,
since every query in the app names its own project explicitly). Both are plain identifiers,
not credentials — they are visible in every deployed Studio's client bundle and in requests
from the browser. They live in `.env`, which is git-ignored, purely to keep them out of this
repo's history, not to keep them secret.

## Running it

```sh
npm run dev
```

The CLI prints a Dashboard URL (`https://www.sanity.io/@<org>?dev=http://localhost:3333`).
Open it in Chrome or Firefox — **Safari cannot load a local dev app in the Dashboard iframe**,
which is a platform limitation, not a bug here.

## Deploying

Deployment needs an **organization-level** robot token with the *Manage SDK Apps* permission
(Manage → your organization → Settings → API → Robot tokens). That is different from the
project-level tokens a Studio deploy uses.

```sh
SANITY_AUTH_TOKEN=<org robot token> npx sanity deploy --title "Fleet"
```

## How it works

Every view is the same machine: **one query per project, rendered per project.** There is no
federated GROQ across projects, so each card and each list section owns its own `useQuery`
(with an explicit `projectId`/`dataset`), its own `<Suspense>` boundary, and its own error
boundary. A slow or unreadable project degrades one card instead of blanking the view.

- `src/lib/queries.ts` — the GROQ, with the filter that keeps system documents out of counts
- `src/fleet/` — the grid and its cards
- `src/project/` — the detail view
- `src/cross/` — the cross-project drafts, stale and search views
- `src/lib/studios.ts` — resolving "open this in its Studio"
- `src/routes.ts` — hash routing, so every view is deep-linkable inside the Dashboard iframe
- `docs/spike-notes.md` — what was verified about the SDK, and what still needs a browser

### Quota bars, deliberately absent

An earlier design showed usage against plan quota from `/v1/data/stats/<dataset>`. That
endpoint's numbers are not trustworthy: its document limit was measured 100× off against a
project's real quota, and dataset size and releases are structurally suspect for the same
reason (project-wide quotas reported through a per-dataset endpoint). Only *attributes* was
verified as correct. Fleet reports content signals from GROQ instead, which are checkable
against the Studio.
