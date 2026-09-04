/**
 * The project table.
 *
 * A grid of cards shows eighteen projects; a table lets you *rank* them —
 * "who has the most drafts waiting", "what has been untouched longest" — which
 * is the question this app exists to answer. TanStack owns sorting, filtering
 * and column visibility; the markup is plain elements styled with Sanity's
 * theme tokens, so the table looks like the rest of Studio without a second
 * design system in the app.
 *
 * Pinned projects are lifted above the sort rather than participating in it:
 * a pin is a standing instruction, not a value to order by.
 */
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {Box, Flex, Text} from '@sanity/ui'
import {useMemo, type JSX} from 'react'
import {useIsMobile} from '../lib/useViewport'
import {daysSince, formatCount, relativeTime} from '../lib/format'
import {usePrefs} from '../lib/PrefsContext'
import type {QueryableProject} from '../lib/projects'
import {StatusDot, type Health} from '../ui/primitives'
import {useSignals, type SignalsEntry} from './SignalsStore'

export interface ProjectRow {
  id: string
  name: string
  dataset: string
  pinned: boolean
  status: SignalsEntry['status']
  drafts: number | null
  stale: number | null
  total: number | null
  lastEditedAt: string | null
  lastEditedTitle: string | null
  health: Health
}

/*
 * v9 registers row models and the sort/filter functions on the feature set
 * itself, so only what this table uses ends up in the bundle.
 */
const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortFns: {basic: sortFn_basic},
  filterFns: {includesString: filterFn_includesString},
})

const columnHelper = createColumnHelper<typeof features, ProjectRow>()

interface ProjectTableProps {
  projects: QueryableProject[]
  filter: string
  onOpenProject: (projectId: string) => void
}

export function ProjectTable({projects, filter, onOpenProject}: ProjectTableProps): JSX.Element {
  const {prefs, togglePin} = usePrefs()
  const signals = useSignals()
  const isMobile = useIsMobile()

  const rows = useMemo<ProjectRow[]>(() => {
    const all = projects.map((project) => toRow(project, signals[project.id], prefs.pinnedProjects))
    // A project still loading has no signals to judge, so it survives the
    // filter rather than flickering out of the table and back in.
    return prefs.attentionOnly
      ? all.filter((row) => row.status !== 'ready' || row.health === 'attention')
      : all
  }, [projects, signals, prefs.pinnedProjects, prefs.attentionOnly])

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('name', {id: 'name', header: 'Project', filterFn: 'includesString'}),
        columnHelper.accessor('drafts', {id: 'drafts', header: 'Drafts'}),
        // The threshold lives in the header: a bare "Stale" count is a number
        // whose meaning is set by a control somewhere else on the page.
        columnHelper.accessor('stale', {id: 'stale', header: `Stale >${prefs.staleDays}d`}),
        columnHelper.accessor('total', {id: 'total', header: 'Documents'}),
        columnHelper.accessor((row) => (row.lastEditedAt ? Date.parse(row.lastEditedAt) : 0), {
          id: 'lastEditedAt',
          header: 'Last edit',
        }),
      ]),
    [prefs.staleDays],
  )

  // Explicit generics: inference falls back to the base TableFeatures/RowData
  // when the options object is built from memoised values, which then rejects
  // the typed column definitions.
  const table = useTable<typeof features, ProjectRow>({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    state: {
      columnFilters: filter ? [{id: 'name', value: filter}] : [],
      // On a phone the table keeps the question it exists to answer — which
      // project has drafts waiting — and drops the columns that are context.
      columnVisibility: isMobile ? {stale: false, total: false, lastEditedAt: false} : {},
    },
    initialState: {sorting: [{id: 'drafts', desc: true}]},
  })

  // Pins ride above whatever sort is active: the sort answers "in what order",
  // the pin answers "regardless of that, show me these first".
  // The head renders from TanStack, so the body must ask it which columns are
  // visible too — hardcoded cells silently drift out of step with the header
  // the moment a column is hidden.
  const visible = new Set(table.getVisibleFlatColumns().map((column) => column.id))

  const sorted = table.getRowModel().rows
  const ordered = useMemo(
    () => [...sorted].sort((a, b) => Number(b.original.pinned) - Number(a.original.pinned)),
    [sorted],
  )

  return (
    <Box className="fleet-table-wrap">
      <table className="fleet-table">
        <thead>
          <tr>
            {table.getHeaderGroups()[0]?.headers.map((header) => {
              const sort = header.column.getIsSorted()
              return (
                <th
                  key={header.id}
                  className={header.column.id === 'name' ? undefined : 'fleet-table__num'}
                >
                  <button type="button" onClick={header.column.getToggleSortingHandler()}>
                    <Text size={1} muted weight="medium">
                      {String(header.column.columnDef.header)}
                      {sort === 'asc' ? ' ↑' : sort === 'desc' ? ' ↓' : ''}
                    </Text>
                  </button>
                </th>
              )
            })}
            <th className="fleet-table__icon">
              <Text size={1} muted weight="medium">
                Status
              </Text>
            </th>
            <th className="fleet-table__pin">
              <Text size={1} muted weight="medium">
                Pin
              </Text>
            </th>
          </tr>
        </thead>

        <tbody>
          {ordered.map((row) => (
            <ProjectTableRow
              key={row.id}
              row={row.original}
              visible={visible}
              onOpen={() => onOpenProject(row.original.id)}
              onTogglePin={() => togglePin(row.original.id)}
            />
          ))}
        </tbody>
      </table>

      {ordered.length === 0 && (
        <Box padding={5}>
          <Text align="center" muted size={1}>
            No projects match.
          </Text>
        </Box>
      )}
    </Box>
  )
}

function ProjectTableRow({
  row,
  visible,
  onOpen,
  onTogglePin,
}: {
  row: ProjectRow
  visible: Set<string>
  onOpen: () => void
  onTogglePin: () => void
}) {
  const quiet = row.status === 'ready' && row.health !== 'attention'

  return (
    <tr className="fleet-table__row" style={{opacity: quiet ? 0.72 : 1}}>
      <td>
        <button type="button" onClick={onOpen} className="fleet-table__name">
          {/*
            The project name alone. The dataset is a constant across every row,
            and the last-edited document's title is detail for the project's own
            page — in a table meant for ranking, a second line of prose per row
            is what makes eighteen rows unscannable.
          */}
          <Text size={1} weight="medium" textOverflow="ellipsis">
            {row.name}
          </Text>
        </button>
      </td>

      {visible.has('drafts') && (
        <Cell value={row.drafts} status={row.status} emphasis={(row.drafts ?? 0) > 0} />
      )}
      {visible.has('stale') && <Cell value={row.stale} status={row.status} />}
      {visible.has('total') && <Cell value={row.total} status={row.status} />}

      {visible.has('lastEditedAt') && (
        <td className="fleet-table__num">
          <Text size={1} muted>
            {row.status === 'loading' ? '…' : row.lastEditedAt ? relativeTime(row.lastEditedAt) : '—'}
          </Text>
        </td>
      )}

      <td className="fleet-table__icon">
        <Flex justify="center">
          <StatusDot health={row.health} title={healthTitle(row)} />
        </Flex>
      </td>

      <td className="fleet-table__pin">
        <button
          type="button"
          onClick={onTogglePin}
          title={row.pinned ? `Unpin ${row.name}` : `Pin ${row.name}`}
          aria-label={row.pinned ? `Unpin ${row.name}` : `Pin ${row.name}`}
          aria-pressed={row.pinned}
          className={row.pinned ? 'is-pinned' : undefined}
        >
          {/* Sized to the row's text, and inheriting its colour from the
              button so hover and pinned states are one CSS concern. */}
          <svg
            width="19"
            height="19"
            viewBox="0 0 25 25"
            fill={row.pinned ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M12.5 4.5l2.4 5.2 5.6.7-4.1 3.9 1.1 5.7-5-2.9-5 2.9 1.1-5.7L4.5 10.4l5.6-.7z" />
          </svg>
        </button>
      </td>
    </tr>
  )
}

function Cell({
  value,
  status,
  emphasis,
}: {
  value: number | null
  status: SignalsEntry['status']
  emphasis?: boolean
}) {
  return (
    <td className="fleet-table__num">
      {status === 'loading' ? (
        <Text size={1} muted>
          …
        </Text>
      ) : status === 'error' ? (
        <Text size={1} muted>
          —
        </Text>
      ) : (
        <Text size={1} weight={emphasis ? 'semibold' : undefined} muted={!emphasis}>
          {value === null ? '—' : formatCount(value)}
        </Text>
      )}
    </td>
  )
}

function healthTitle(row: ProjectRow): string {
  if (row.status === 'error') return 'Unavailable'
  if (row.status === 'loading') return 'Loading'
  return row.health === 'attention' ? 'Drafts waiting' : 'Nothing waiting'
}

function toRow(
  project: QueryableProject,
  entry: SignalsEntry | undefined,
  pinned: string[],
): ProjectRow {
  const base = {
    id: project.id,
    name: project.displayName,
    pinned: pinned.includes(project.id),
  }

  if (!entry || entry.status === 'loading') {
    return {
      ...base,
      dataset: '',
      status: 'loading',
      drafts: null,
      stale: null,
      total: null,
      lastEditedAt: null,
      lastEditedTitle: null,
      health: 'unknown',
    }
  }

  if (entry.status === 'error') {
    return {
      ...base,
      dataset: entry.dataset,
      status: 'error',
      drafts: null,
      stale: null,
      total: null,
      lastEditedAt: null,
      lastEditedTitle: null,
      health: 'unknown',
    }
  }

  const {signals} = entry
  return {
    ...base,
    dataset: entry.dataset,
    status: 'ready',
    drafts: signals.drafts,
    stale: signals.stale,
    total: signals.total,
    lastEditedAt: signals.lastEdited?._updatedAt ?? null,
    lastEditedTitle: signals.lastEdited?.title ?? null,
    health: signals.total === 0 ? 'unknown' : signals.drafts > 0 ? 'attention' : 'ok',
  }
}

/** Days since a project was last touched — used by the stale column's tooltip. */
export function ageInDays(row: ProjectRow): number {
  return daysSince(row.lastEditedAt)
}
