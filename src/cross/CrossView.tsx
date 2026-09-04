/**
 * Cross-project views: drafts, stale documents, and search.
 *
 * These are the screens a Studio cannot produce — one query per project, fanned
 * out and rendered per project. Results are grouped by project rather than
 * merged into one globally sorted list: each project resolves independently, so
 * a global sort would mean holding every section's data in a parent and losing
 * the per-project Suspense that keeps a slow project from blocking the rest.
 */
import {useDatasets, useProjects, useQuery} from '@sanity/sdk-react'
import {Card, Heading, Stack, Text} from '@sanity/ui'
import {Suspense, useMemo, type JSX} from 'react'
import {LIST_LIMIT} from '../config'
import {chooseDataset, usePrefs} from '../lib/PrefsContext'
import {staleBefore} from '../lib/format'
import {DRAFTS_QUERY, SEARCH_QUERY, STALE_QUERY, type DocumentRow} from '../lib/queries'
import {DocumentList} from '../ui/DocumentList'
import {ErrorBoundary} from '../ui/ErrorBoundary'
import {CardSkeleton, ErrorCard} from '../ui/primitives'

export type CrossMode = 'drafts' | 'stale' | 'search'

interface CrossViewProps {
  mode: CrossMode
  /** Search term; ignored by the drafts and stale modes. */
  query?: string
}

const HEADINGS: Record<CrossMode, string> = {
  drafts: 'Drafts waiting across all projects',
  stale: 'Stale documents across all projects',
  search: 'Search across all projects',
}

export function CrossView({mode, query = ''}: CrossViewProps): JSX.Element {
  const {prefs} = usePrefs()
  const {data: projects} = useProjects()

  const visible = useMemo(
    () =>
      projects
        .filter((project) => !project.isDisabled && !project.isBlocked)
        .filter(
          (project) =>
            prefs.visibleProjects.length === 0 || prefs.visibleProjects.includes(project.id),
        )
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'sv')),
    [projects, prefs.visibleProjects],
  )

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
      <Heading size={1}>{HEADINGS[mode]}</Heading>
      {visible.map((project) => (
        <ErrorBoundary
          key={project.id}
          fallback={(error) => <ErrorCard title={project.displayName} error={error} />}
        >
          <Suspense fallback={<CardSkeleton height={96} />}>
            <ProjectSection
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

function ProjectSection({
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
  const {data: datasets} = useDatasets({projectId})
  const dataset = chooseDataset(datasets, projectId, prefs)

  if (!dataset) return null

  return (
    <Suspense fallback={<CardSkeleton height={96} />}>
      <ProjectRows
        projectId={projectId}
        projectName={projectName}
        dataset={dataset}
        mode={mode}
        query={query}
      />
    </Suspense>
  )
}

function ProjectRows({
  projectId,
  projectName,
  dataset,
  mode,
  query,
}: {
  projectId: string
  projectName: string
  dataset: string
  mode: CrossMode
  query: string
}): JSX.Element | null {
  const {prefs} = usePrefs()

  const {data: rows} = useQuery<DocumentRow[]>({
    query: mode === 'drafts' ? DRAFTS_QUERY : mode === 'stale' ? STALE_QUERY : SEARCH_QUERY,
    params: {
      limit: LIST_LIMIT,
      staleBefore: staleBefore(prefs.staleDays),
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
