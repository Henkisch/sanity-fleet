/**
 * GROQ used by Fleet.
 *
 * Every query here runs once per project (fan-out), so each one is capped and
 * projected — see the App SDK best-practices note on keeping raw `useQuery`
 * performant. Aggregates (`count()`) are the legitimate case for `useQuery`;
 * document lists stay slice-limited and projected rather than unfurled.
 *
 * Two filters recur:
 *   CONTENT                     drops everything that is not editorial content:
 *                               assets (`sanity.*`), and the access-control
 *                               documents the Content Lake keeps under the `_.`
 *                               id prefix (`system.group`, `system.role`).
 *                               Verified against live projects — without the
 *                               `_.` exclusion, "last edited" reports
 *                               `_.groups.access-manager` on most projects.
 *   _id in path("drafts.**")    isolates drafts. Published documents are the
 *                               complement of that set.
 */

/** Documents a human would recognise as content. */
const CONTENT = `!(_id in path("_.**")) && !(_type match "sanity.*") && !(_type match "system.*")`

/**
 * Fields worth showing in a list row, across schemas Fleet knows nothing about.
 *
 * `status` is the one Sanity concept a list of documents has to get right. A
 * document is *published* when it has no draft, a *draft* when it has never
 * been published, and *edited* when both versions exist — the same three states
 * Studio shows, and they cannot be read off an id alone: `drafts.abc` only
 * says a draft exists, not whether `abc` does. Hence the counterpart lookup.
 */
const ROW_PROJECTION = `{
  _id,
  _type,
  _updatedAt,
  "title": coalesce(title, name, label, heading, slug.current, _id),
  "status": select(
    !(_id in path("drafts.**")) => "published",
    count(*[_id == string::split(^._id, "drafts.")[1]]) > 0 => "edited",
    "draft"
  )
}`

/** Everything one project card needs, in a single round trip. */
export const SIGNALS_QUERY = `{
  "total": count(*[${CONTENT} && !(_id in path("drafts.**"))]),
  "drafts": count(*[${CONTENT} && _id in path("drafts.**")]),
  "stale": count(*[
    ${CONTENT} &&
    !(_id in path("drafts.**")) &&
    _updatedAt < $staleBefore
  ]),
  "lastEdited": *[${CONTENT}] | order(_updatedAt desc)[0]${ROW_PROJECTION}
}`

/** Drafts awaiting publication, newest first. */
export const DRAFTS_QUERY = `*[
  ${CONTENT} &&
  _id in path("drafts.**")
] | order(_updatedAt desc)[0...$limit]${ROW_PROJECTION}`

/** Published documents untouched since `$staleBefore`, oldest first. */
export const STALE_QUERY = `*[
  ${CONTENT} &&
  !(_id in path("drafts.**")) &&
  _updatedAt < $staleBefore
] | order(_updatedAt asc)[0...$limit]${ROW_PROJECTION}`

/** Recently touched documents, drafts included. Powers the project detail view. */
export const RECENT_QUERY = `*[
  ${CONTENT}
] | order(_updatedAt desc)[0...$limit]${ROW_PROJECTION}`

/**
 * Cross-project document search.
 *
 * This is not Sanity's search: there is no relevance ranking and no full-text
 * index behind it. Fleet has no schema knowledge, so it matches the field names
 * that carry a human-readable label in practically every Sanity schema, and a
 * document that titles itself through some other field will not appear.
 *
 * It earns its place anyway — searching across projects is the one thing a
 * Studio structurally cannot do — but the interface calls it "find documents"
 * rather than "search" so nobody reads a miss as an absence.
 */
export const SEARCH_QUERY = `*[
  ${CONTENT} && (
    title match $q ||
    name match $q ||
    label match $q ||
    heading match $q ||
    slug.current match $q
  )
] | order(_updatedAt desc)[0...$limit]${ROW_PROJECTION}`

/** Shape returned by SIGNALS_QUERY. */
export interface ProjectSignals {
  total: number
  drafts: number
  stale: number
  lastEdited: DocumentRow | null
}

/** The three states Studio shows for a document. */
export type DocumentStatus = 'published' | 'draft' | 'edited'

/** Shape returned by the list queries above. */
export interface DocumentRow {
  _id: string
  _type: string
  _updatedAt: string
  title: string
  status: DocumentStatus
}

/** A published document id, given a possibly-draft id. */
export function publishedId(id: string): string {
  return id.startsWith('drafts.') ? id.slice('drafts.'.length) : id
}
