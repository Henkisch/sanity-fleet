/**
 * Every scoped project's signals, in one place.
 *
 * Cards could each own their query and stay independent. A *sortable* table
 * cannot: ordering rows by drafts means knowing every project's drafts before
 * the first row renders. So each project still fetches on its own — behind its
 * own Suspense and error boundary, so one slow or unreadable project cannot
 * stall the rest — but publishes the result here, and the table reads the map.
 *
 * The fetchers render nothing. They exist to turn N independent suspending
 * queries into one plain object the table can sort.
 */
import {useQuery} from '@sanity/sdk-react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react'
import {assumedDataset} from '../lib/datasets'
import {usePrefs} from '../lib/PrefsContext'
import {staleBefore} from '../lib/format'
import {SIGNALS_QUERY, type ProjectSignals} from '../lib/queries'
import type {QueryableProject} from '../lib/projects'
import {ErrorBoundary} from '../ui/ErrorBoundary'
import {Suspense} from 'react'

export type SignalsEntry =
  | {status: 'loading'}
  | {status: 'ready'; dataset: string; signals: ProjectSignals}
  | {status: 'error'; dataset: string; error: unknown}

type SignalsMap = Record<string, SignalsEntry>

const SignalsContext = createContext<SignalsMap>({})

export function useSignals(): SignalsMap {
  return useContext(SignalsContext)
}

export function SignalsProvider({
  projects,
  children,
}: {
  projects: QueryableProject[]
  children: ReactNode
}): JSX.Element {
  const {prefs} = usePrefs()
  const [signals, setSignals] = useState<SignalsMap>({})

  const publish = useCallback((projectId: string, entry: SignalsEntry) => {
    setSignals((current) => {
      const existing = current[projectId]
      if (existing && shallowEqual(existing, entry)) return current
      return {...current, [projectId]: entry}
    })
  }, [])

  // Projects that left the scope should not keep reporting into it.
  const scopedIds = useMemo(() => projects.map((project) => project.id).join(','), [projects])
  useEffect(() => {
    const ids = new Set(scopedIds.split(',').filter(Boolean))
    setSignals((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([id]) => ids.has(id)))
      return Object.keys(next).length === Object.keys(current).length ? current : next
    })
  }, [scopedIds])

  return (
    <SignalsContext.Provider value={signals}>
      <div hidden>
        {projects.map((project) => {
          const dataset = assumedDataset(project.id, prefs)
          return (
            <ErrorBoundary
              key={`${project.id}:${dataset}:${prefs.staleDays}`}
              fallback={(error) => (
                <Publish
                  projectId={project.id}
                  entry={{status: 'error', dataset, error}}
                  publish={publish}
                />
              )}
            >
              <Suspense fallback={<Publish projectId={project.id} entry={{status: 'loading'}} publish={publish} />}>
                <SignalsFetcher projectId={project.id} dataset={dataset} publish={publish} />
              </Suspense>
            </ErrorBoundary>
          )
        })}
      </div>
      {children}
    </SignalsContext.Provider>
  )
}

function SignalsFetcher({
  projectId,
  dataset,
  publish,
}: {
  projectId: string
  dataset: string
  publish: (projectId: string, entry: SignalsEntry) => void
}) {
  const {prefs} = usePrefs()
  const {data} = useQuery<ProjectSignals>({
    query: SIGNALS_QUERY,
    params: {staleBefore: staleBefore(prefs.staleDays)},
    projectId,
    dataset,
    // Drafts live alongside published documents; the raw perspective is the
    // only one that can count both in a single query.
    perspective: 'raw',
  })

  return <Publish projectId={projectId} entry={{status: 'ready', dataset, signals: data}} publish={publish} />
}

function Publish({
  projectId,
  entry,
  publish,
}: {
  projectId: string
  entry: SignalsEntry
  publish: (projectId: string, entry: SignalsEntry) => void
}) {
  useEffect(() => {
    publish(projectId, entry)
    // The entry is rebuilt on each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, publish, entry.status, JSON.stringify(entry)])

  return null
}

function shallowEqual(a: SignalsEntry, b: SignalsEntry): boolean {
  if (a.status !== b.status) return false
  if (a.status === 'ready' && b.status === 'ready') {
    return (
      a.dataset === b.dataset &&
      a.signals.total === b.signals.total &&
      a.signals.drafts === b.signals.drafts &&
      a.signals.stale === b.signals.stale &&
      a.signals.lastEdited?._updatedAt === b.signals.lastEdited?._updatedAt
    )
  }
  return a.status === 'loading' && b.status === 'loading'
}
