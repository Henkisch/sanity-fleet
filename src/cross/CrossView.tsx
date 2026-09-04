/**
 * Cross-project views: drafts, stale documents, recent activity, and search.
 *
 * These are the screens a Studio cannot produce — one query per project, fanned
 * out and rendered per project. Results are grouped by project rather than
 * merged into one globally sorted list: each project resolves independently, so
 * a global sort would mean holding every section's data in a parent and losing
 * the per-project Suspense that keeps a slow project from blocking the rest.
 */
import {useQuery} from '@sanity/sdk-react'
import {Card, Stack, Text} from '@sanity/ui'
import {Suspense, useMemo, type JSX} from 'react'
import {ACTIVITY_DAYS, LIST_LIMIT} from '../config'
import {assumedDataset} from '../lib/datasets'
import {usePrefs} from '../lib/PrefsContext'
import type {QueryableProject} from '../lib/projects'
import {staleBefore} from '../lib/format'
import {
  ACTIVITY_QUERY,
  DRAFTS_QUERY,
  SEARCH_QUERY,
  STALE_QUERY,
  type DocumentRow,
} from '../lib/queries'
import {useSignals, type SignalsEntry} from '../fleet/SignalsStore'
import {DocumentList} from '../ui/DocumentList'
import {ErrorBoundary} from '../ui/ErrorBoundary'
import {CardSkeleton, InlineUnavailable} from '../ui/primitives'

export type CrossMode = 'drafts' | 'stale' | 'search' | 'activity'

/*
 * Drafts is what is waiting and stale is what was forgotten; activity is the
 * third state those two imply but neither shows — what is actually moving.
 * It reuses the query behind the project detail view, at fleet scope.
 */
const QUERIES: Record<CrossMode, string> = {
  activity: ACTIVITY_QUERY,
  drafts: DRAFTS_QUERY,
  search: SEARCH_QUERY,
  stale: STALE_QUERY,
}

interface CrossViewProps {
  mode: CrossMode
  /** The projects to fan out across — already scoped by the caller. */
  projects: QueryableProject[]
  /** Search term; ignored by every mode but search. */
  query?: string
}

export function CrossView({mode, projects, query = ''}: CrossViewProps): JSX.Element {
  const ordered = useOrderedByRecency(projects, mode)

  if (mode === 'search' && query.trim().length < 2) {
    return (
      <Card padding={5} radius={3} tone="transparent">
        <Text align="center" muted size={1}>
          Type at least two characters to search every project.
        </Text>
      </Card>
    )
  }

  return (
    <Stack gap={5}>
      {ordered.map((project) => (
        <ErrorBoundary
          key={project.id}
          fallback={(error) => <InlineUnavailable title={project.displayName} error={error} />}
        >
          <Suspense fallback={<CardSkeleton height={96} />}>
            <ProjectRows
              projectId={project.id}
              projectName={project.displayName}
              mode={mode}
              query={query}
            />
          </Suspense>
        </ErrorBoundary>
      ))}
    </Stack>
  )
}

/**
 * Sections ordered by when each project was last touched, not by name.
 *
 * Alphabetical carries no information here: these are attention views, and a
 * project nobody has opened in three years should not sit above a live one
 * because of its initial. Stale reverses it — that view asks which project has
 * been neglected longest, so the least recently touched leads.
 *
 * The timestamps come from the signals store, which the overview already
 * fetched, so ordering costs no extra query and does not wait on the per-project
 * queries below. A project whose signals have not arrived sorts last in either
 * direction rather than jumping position when they do.
 */
function useOrderedByRecency(
  projects: QueryableProject[],
  mode: CrossMode,
): QueryableProject[] {
  const signals = useSignals()

  return useMemo(() => {
    const direction = mode === 'stale' ? 1 : -1

    return [...projects].sort((a, b) => {
      const left = lastEditedAt(signals[a.id])
      const right = lastEditedAt(signals[b.id])
      if (left === null && right === null) return a.displayName.localeCompare(b.displayName)
      if (left === null) return 1
      if (right === null) return -1
      return (left - right) * direction
    })
  }, [projects, signals, mode])
}

/** Milliseconds of a project's most recent edit, or null if it has not answered. */
function lastEditedAt(entry: SignalsEntry | undefined): number | null {
  if (entry?.status !== 'ready') return null
  const updatedAt = entry.signals.lastEdited?._updatedAt
  return updatedAt ? Date.parse(updatedAt) : null
}

function ProjectRows({
  projectId,
  projectName,
  mode,
  query,
}: {
  projectId: string
  projectName: string
  mode: CrossMode
  query: string
}): JSX.Element | null {
  const {prefs} = usePrefs()
  const dataset = assumedDataset(projectId, prefs)

  const {data: rows} = useQuery<DocumentRow[]>({
    query: QUERIES[mode],
    params: {
      limit: LIST_LIMIT,
      staleBefore: staleBefore(prefs.staleDays),
      activeSince: staleBefore(ACTIVITY_DAYS),
      // GROQ's `match` is prefix-based on words; the wildcard makes partial
      // words match the way a search box is expected to behave.
      q: `${query.trim()}*`,
    },
    projectId,
    dataset,
    perspective: 'raw',
  })

  // Projects with nothing to report are omitted entirely — the point of these
  // views is what needs attention, not a roll call.
  if (rows.length === 0) return null

  return (
    <Stack gap={3}>
      <Text size={1} weight="semibold">
        {projectName} <span style={{opacity: 0.6}}>· {dataset} · {rows.length}</span>
      </Text>
      <DocumentList
        rows={rows}
        projectId={projectId}
        dataset={dataset}
        emptyMessage="Nothing here."
      />
    </Stack>
  )
}
