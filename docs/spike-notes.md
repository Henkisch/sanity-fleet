# Discovery notes

What was verified while building the first slice, and what still needs a browser.

## Verified from the SDK's own type definitions (`@sanity/sdk-react` 3.1.0)

- **`SanityApp.config` is optional** (`config?: SanityConfig | SanityConfig[]`). Fleet still
  passes a bootstrap entry (`src/config.ts`) so the instance has a default resource; every
  query names its own project and dataset regardless.
- **`useQuery` takes `projectId`, `dataset` and `perspective` inline** — `QueryOptions`
  extends `DatasetHandle`, which extends `ProjectHandle` and `PerspectiveHandle`. This is the
  fan-out mechanism; no `ResourceProvider` needed (and `ResourceProvider` is `@internal`).
- **`useProjects` accepts `organizationId`, `includeMembers`, `includeFeatures` and
  `onlyExplicitMembership`.** The published reference page omits `onlyExplicitMembership`, but
  it is present in `ProjectsOptions`.
- **`useDatasets(options?: ProjectHandle)`** returns `@sanity/client`'s `DatasetsResponse`
  (an array of `{name, aclMode, …}`), so datasets can be listed for any project id.
- **Studio links**: `useStudioWorkspacesByProjectIdDataset()` returns a map keyed
  `` `${projectId}:${dataset}` `` of `{url, basePath, title, …}`. It is marked `@internal`;
  `src/lib/studios.ts` treats a miss as normal and falls back to the project's Manage page.
  `useNavigateToStudioDocument` lives in `@sanity/sdk-react/dashboard` and is the alternative
  if the map ever disappears.
- **Sanity UI v4 renamed `space` to `gap`** on layout components, and `Grid`'s `columns` to
  `gridTemplateColumns`. Both old props are typed `never`, so this fails the typecheck rather
  than silently doing nothing.

## Verified against live projects (HTTP query API, this account's token)

Ran `SIGNALS_QUERY`, `DRAFTS_QUERY` and `SEARCH_QUERY` against three projects in two
organizations, dataset `production`, `perspective=raw`:

- Counts and drafts resolve correctly; `perspective=raw` is required to see drafts and
  published documents in one query.
- **Bug caught here:** the first filter only excluded `sanity.*` types, and "last edited"
  came back as `_.groups.access-manager` (`system.group`) on two of three projects. The
  Content Lake keeps access-control documents under the `_.` id prefix. `queries.ts` now
  excludes `_.**` ids and `system.*` types as well — after the fix the same projects report
  real content (`article`, `blog`, `sponsor`).
- Search matches on `title`/`name`/`label`/`heading`/`slug.current` with a trailing `*`,
  which behaves like a search box on partial words.

## Still unverified — needs the app open in the Dashboard

The Chrome extension was not connected in this session, and the Dashboard requires an
interactive Sanity login, so these are open:

1. **Cross-org reach.** This account belongs to two organizations (one personal, one agency).
   The app is deployed under the personal org. Auth docs say Dashboard mode injects a *global*
   user token, so the agency org's projects should render — confirm in the browser. The fleet
   view already groups by organization, which makes this obvious at a glance.
2. **Independent card failure.** A project the user cannot read should fail inside its own
   card (`ErrorBoundary` per card), not blank the grid.
3. **Live updates.** Editing a document in a Studio should move the corresponding card's
   counts without a reload.
4. **Fan-out cost at 21 projects.** Each card issues one `useDatasets` and one `useQuery`.
   Watch the network panel for rate limiting before adding throttling.
