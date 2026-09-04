/**
 * One project in detail: what is waiting, and a way into the Studio.
 *
 * The dataset picker is optional chrome. Listing a project's datasets requires
 * a grant the user may not hold (see `src/lib/datasets.ts`), so the panels run
 * against the assumed dataset and the picker upgrades that guess when the API
 * allows it. A failing picker never takes the panels down with it.
 */
import {useDatasets, useProject, useQuery} from '@sanity/sdk-react'
import {Box, Button, Flex, Heading, Inline, Select, Stack, Tab, TabList, TabPanel, Text} from '@sanity/ui'
import {Suspense, useState, type JSX} from 'react'
import {LIST_LIMIT} from '../config'
import {assumedDataset, chooseDataset} from '../lib/datasets'
import {usePrefs} from '../lib/PrefsContext'
import {staleBefore} from '../lib/format'
import {DRAFTS_QUERY, RECENT_QUERY, STALE_QUERY, type DocumentRow} from '../lib/queries'
import {manageUrl, useStudio} from '../lib/studios'
import {DocumentList} from '../ui/DocumentList'
import {ErrorBoundary} from '../ui/ErrorBoundary'
import {CardSkeleton, UnavailableCard} from '../ui/primitives'

type Panel = 'recent' | 'drafts' | 'stale'

const PANELS: {id: Panel; label: string; empty: string}[] = [
  {id: 'recent', label: 'Recent', empty: 'No documents yet.'},
  {id: 'drafts', label: 'Drafts', empty: 'Nothing waiting to be published.'},
  {id: 'stale', label: 'Stale', empty: 'Nothing has gone stale.'},
]

export function ProjectView({
  projectId,
  onBack,
}: {
  projectId: string
  onBack: () => void
}): JSX.Element {
  const {prefs} = usePrefs()
  const dataset = assumedDataset(projectId, prefs)
  const [panel, setPanel] = useState<Panel>('drafts')

  return (
    <Stack gap={4}>
      <Flex align="center" gap={3}>
        <Button fontSize={1} mode="bleed" text="← Fleet" onClick={onBack} />
        <Box flex={1}>
          <ErrorBoundary fallback={() => <Heading size={2}>{projectId}</Heading>}>
            <Suspense fallback={<Heading size={2}>Loading…</Heading>}>
              <ProjectHeading projectId={projectId} />
            </Suspense>
          </ErrorBoundary>
        </Box>
        <Button
          as="a"
          href={manageUrl(projectId)}
          target="_blank"
          rel="noreferrer"
          fontSize={1}
          mode="ghost"
          text="Manage"
        />
      </Flex>

      <Flex align="center" gap={3} wrap="wrap">
        <ErrorBoundary
          fallback={() => (
            <Inline gap={2}>
              <Text size={1} muted>
                Dataset
              </Text>
              <Text size={1}>{dataset}</Text>
            </Inline>
          )}
        >
          <Suspense
            fallback={
              <Inline gap={2}>
                <Text size={1} muted>
                  Dataset
                </Text>
                <Text size={1}>{dataset}</Text>
              </Inline>
            }
          >
            <DatasetPicker projectId={projectId} />
          </Suspense>
        </ErrorBoundary>

        <Box flex={1} />

        <OpenStudioButton projectId={projectId} />
      </Flex>

      <TabList gap={2}>
        {PANELS.map((entry) => (
          <Tab
            key={entry.id}
            id={`${entry.id}-tab`}
            aria-controls={`${entry.id}-panel`}
            label={entry.label}
            selected={panel === entry.id}
            onClick={() => setPanel(entry.id)}
          />
        ))}
      </TabList>

      {PANELS.map((entry) => (
        <TabPanel
          key={entry.id}
          id={`${entry.id}-panel`}
          aria-labelledby={`${entry.id}-tab`}
          hidden={panel !== entry.id}
        >
          {panel === entry.id && (
            <ErrorBoundary
              resetKey={`${projectId}:${dataset}:${entry.id}`}
              fallback={(error) => (
                <UnavailableCard title={entry.label} subtitle={dataset} error={error} />
              )}
            >
              <Suspense fallback={<CardSkeleton height={180} />}>
                <PanelRows
                  projectId={projectId}
                  dataset={dataset}
                  panel={entry.id}
                  emptyMessage={entry.empty}
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </TabPanel>
      ))}
    </Stack>
  )
}

function ProjectHeading({projectId}: {projectId: string}): JSX.Element {
  const {data: project} = useProject({projectId})
  return <Heading size={2}>{project.displayName}</Heading>
}

function DatasetPicker({projectId}: {projectId: string}): JSX.Element {
  const {prefs, update} = usePrefs()
  const {data: datasets} = useDatasets({projectId})
  const current = chooseDataset(datasets, projectId, prefs) ?? assumedDataset(projectId, prefs)

  if (datasets.length === 0) {
    return (
      <Text size={1} muted>
        This project has no datasets.
      </Text>
    )
  }

  return (
    <Inline gap={2}>
      <Text size={1} muted>
        Dataset
      </Text>
      <Select
        fontSize={1}
        value={current}
        onChange={(event) =>
          update({
            datasetByProject: {...prefs.datasetByProject, [projectId]: event.currentTarget.value},
          })
        }
      >
        {datasets.map((entry) => (
          <option key={entry.name} value={entry.name}>
            {entry.name}
          </option>
        ))}
      </Select>
    </Inline>
  )
}

function OpenStudioButton({projectId}: {projectId: string}): JSX.Element {
  const studio = useStudio(projectId)

  // Resolution is async rather than suspenseful, so the button starts disabled
  // and becomes a link — it never blocks the panels behind it.
  if (studio === undefined) return <Button fontSize={1} mode="ghost" text="Open Studio" disabled />
  if (studio === null) return <Button fontSize={1} mode="ghost" text="No Studio deployed" disabled />

  return (
    <Button
      as="a"
      href={studio.url}
      target="_blank"
      rel="noreferrer"
      fontSize={1}
      mode="ghost"
      text={`Open ${studio.title}`}
    />
  )
}

function PanelRows({
  projectId,
  dataset,
  panel,
  emptyMessage,
}: {
  projectId: string
  dataset: string
  panel: Panel
  emptyMessage: string
}): JSX.Element {
  const {prefs} = usePrefs()
  const {data: rows} = useQuery<DocumentRow[]>({
    query: panel === 'drafts' ? DRAFTS_QUERY : panel === 'stale' ? STALE_QUERY : RECENT_QUERY,
    params: {limit: LIST_LIMIT, staleBefore: staleBefore(prefs.staleDays)},
    projectId,
    dataset,
    perspective: 'raw',
  })

  return (
    <DocumentList rows={rows} projectId={projectId} dataset={dataset} emptyMessage={emptyMessage} />
  )
}
