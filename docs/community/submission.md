# Sanity Community submission — Fleet

Paste-ready content for the community project form. The long-form section below
maps to "In-depth explanation of the project"; the short lists map to the
remaining fields.

---

## In-depth explanation of the project

**Fleet is a cross-project overview for Sanity.** It answers one question that a
Studio structurally cannot: *across every project I can reach, what needs
attention right now?* A Studio is bound to one project and one dataset. If you
run twenty of them, the only way to find the drafts you left unpublished last
month is to open twenty tabs.

Fleet runs in the Sanity Dashboard, built on the App SDK. It lists every project
you can reach — across organizations — in one sortable table: drafts waiting,
stale documents, total documents, last edit. Sort by drafts and the answer is
the top row. Clicking any document takes you straight into that project's
Studio, to that document. It is deliberately read-only: it tells you where to
go, then gets out of the way.

### The architecture, and the constraint that forces it

**There is no federated GROQ across projects.** Every `useQuery` is scoped to one
project and dataset. A cross-project view is therefore N queries fanned out and
merged on the client, and that shapes everything.

The rule I settled on: **one query per project, each in its own Suspense and
error boundary.** A slow project degrades one row. A project you cannot read
fails inside its own row and leaves the rest of the table intact. There is no
global spinner, because a global spinner means the slowest project decides when
anyone sees anything.

Sorting complicated this. Ordering rows by draft count means knowing every
project's count *before* the first row renders — the exact thing per-row
isolation avoids. The compromise: each project still fetches independently, but
publishes into a shared store that the table reads. Rows that haven't answered
yet render a placeholder and sort last. Failure isolation survives; the sort
gets its data.

### Six things that cost real time

**1. The dataset stats endpoint lies.** `/v1/data/stats/<dataset>` returns
`value`/`limit` pairs and looks like the obvious source for quota bars. Only one
of its four metrics is trustworthy. The document limit came back as `1000000`
against a real quota of `10000` — a hundredfold error, not a rounding issue.
The cause is structural: document quota is **project-wide**, and this is a
**per-dataset** endpoint. Attributes is genuinely per-dataset and correct;
size and releases are unverified and carry the same structural risk. Fleet
dropped quota bars entirely and reports content signals from GROQ instead,
because a number you cannot check against the Studio is worse than no number.

**2. System documents poison every count.** Filtering `!(_type match "sanity.*")`
is not enough. The Content Lake keeps access-control documents under an
underscore id prefix, and on two of three test projects "last edited" reported
`_.groups.access-manager` rather than any real content. The filter needs to
exclude ids under `_.` and `system.*` types as well.

**3. A timestamp parameter caused an infinite fetch loop.** The stale cutoff was
computed as `Date.now() - days`, passed as a GROQ parameter. The SDK keys its
query cache on the query **plus its parameters**, so every render produced a new
key, which suspended, which re-rendered, which produced another. Cards spun
forever. The fix is one line — floor the cutoff to the start of the UTC day —
and it is also more honest: "untouched for 90 days" does not get truer at
millisecond precision.

**4. Studio deep links need a global-scoped client.** The SDK's own studio lookup
reads Dashboard context and never settles when the app is opened directly, so
every row fell back to a useless "open in Manage" link. The per-project
user-applications endpoint works anywhere. One trap: the client must be
**global-scoped** — a project-scoped host answers `/projects/<other-id>` with
*its own* application list, which silently pointed all fifty links at the same
Studio before I noticed.

**5. Disabled projects return 402 forever.** Three projects answered `402 Payment
Required` on both the query and the live-events endpoint. They are the ones
their owner switched off — present in `useProjects`, but dead. The SDK retries
live events every second, so each one flooded the console indefinitely. Fleet
now gates on `isDisabled`, `isDisabledByUser` and `isBlocked` together, before a
row is ever rendered.

**6. CORS is per project, per origin.** Every project must allow the app's origin
before it will answer. In development that means adding `localhost:3333` to each
project — and if you lack the CORS grant on one, that project simply cannot be
read from there. Fleet turns the resulting error into a one-click repair: the
error message names the exact Manage URL, so the failing row renders a button
that goes straight to it. Deploying through `sanity deploy` avoids the whole
chore, since the app is then served from Sanity's own origin.

### Making it look like it belongs

The app uses Sanity UI so it sits naturally beside Studio. Two things about that
are worth passing on, because neither is obvious and both were found by
measuring rather than guessing.

**Studio's font does not come for free.** Sanity UI's theme asks for Inter, but a
standalone app has to ship it or every surface silently falls back to the system
stack — which is most of why a well-built App SDK app can still feel "not quite
Sanity". Two more defaults matter: Studio renders antialiased, and it styles the
document element, which the generated `index.html` does not. One trap: the
variable-font package registers the family as `"Inter Variable"`, which never
matches the theme's request for `"Inter"` — the faces load and go completely
unused. The static package is the one that works.

**Sanity UI's runtime CSS beats your stylesheet.** It is styled-components: its
generated classes have the same specificity as your own single-class rules and
are injected *after* your static CSS, so source order decides and you lose. A
`min-height` on a nav row shipped, computed to `0px`, and looked like a bug in
the component. The fix is a doubled selector (`.nav-item.nav-item`) plus a
comment explaining why, or someone will "simplify" it back and silently break it.
This bit me twice in one project.

### What I would tell someone starting one of these

- **Verify every number against the Studio before you display it.** Two of the
  three data sources I reached for were wrong in ways that looked plausible.
- **Decide your failure unit early.** "One project fails alone" drove the whole
  component structure, and retrofitting it would have been painful.
- **Measure the interface instead of eyeballing it.** The font problem, the
  specificity problem and a six-pixel row misalignment were all invisible to the
  eye and obvious to `getComputedStyle`.
- **The Dashboard's token is scoped to one organization.** An app installed in
  organization A lists that organization's projects, even for a user who belongs
  to several. Open the same build outside the Dashboard and it authenticates
  through the login redirect instead, gets a global user token, and lists every
  organization — which is exactly how I fooled myself into believing cross-org
  worked. Test inside the Dashboard, not at `localhost` directly; they are
  different auth contexts and only one of them is what ships.

---

## Frameworks used

- **React** — the App SDK is React-first; Fleet is React 19 with no meta-framework.
  (Vite is the bundler, supplied by the Sanity CLI rather than configured directly.)

## Integrations & services used

None. Fleet talks only to Sanity — the Content Lake for content, the projects and
applications APIs for the fleet itself. Its whole point is that it needs nothing else.

## Sanity tools used

- **Sanity App SDK** (`@sanity/sdk-react`) — the foundation; `useProjects`,
  `useQuery`, `useDatasets`
- **Sanity Dashboard** — where the app is installed and where it gets its auth
- **Sanity UI** (`@sanity/ui`) — the entire visual layer
- **Sanity Icons** (`@sanity/icons`)
- **GROQ** — every signal in the table
- **Sanity CLI** — `sanity dev` / `sanity build` / `sanity deploy`

## Categories

Suggested, in order of fit:

- Developer tools / DX
- Dashboards & internal tools
- Content operations
- Multi-project / agency workflows

## Suggested tagline

> Every Sanity project you can reach, in one sortable table — and one click into
> the Studio that owns the document.
