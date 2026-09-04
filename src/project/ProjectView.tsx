/**
 * One project in detail: pick a dataset, see what is waiting, jump into Studio.
 *
 * This is the "narrow" half of the app. It never edits anything — every row
 * links out to the Studio that owns the document.
 */
import {useDatasets, useProject, useQuery} from '@sanity/sdk-react'
import {Box, Button, Card, Flex, Heading, Inline, Select, Stack, Tab, TabList, TabPanel, Text} from '@sanity/ui'
import {Suspense, useState, type JSX} from 'react'
import {LIST_LIMIT} from '../config'
import {chooseDataset, usePrefs} from '../lib/PrefsContext'
import {staleBefore} from '../lib/format'
import {DRAFTS_QUERY, RECENT_QUERY, STALE_QUERY, type DocumentRow} from '../lib/queries'
import {manageUrl, useStudioLookup} from '../lib/studios'
import {DocumentList} from '../ui/DocumentList'
import {ErrorBoundary} from '../ui/ErrorBoundary'
import {CardSkeleton, ErrorCard} from '../ui/primitives'

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
  return (
    <ErrorBoundary fallback={(error) => <ErrorCard title={projectId} error={error} />}>
      <Suspense fallback={<CardSkeleton height={280} />}>
        <ProjectDetail projectId={projectId} onBack={onBack} />
      </Suspense>
    </ErrorBoundary>
  )
}

function ProjectDetail({projectId, onBack}: {projectId: string; onBack: () => void}): JSX.Element {
  const {data: project} = useProject({projectId})

  return (
    <Stack gap={4}>
      <Flex align="center" gap={3}>
        <Button fontSize={1} mode="bleed" text="← Fleet" onClick={onBack} />
        <Box flex={1}>
          <Heading size={2}>{project.displayName}</Heading>
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

      <Suspense fallback={<CardSkeleton height={220} />}>
        <ProjectDatasetPanels projectId={projectId} />
      </Suspense>
    </Stack>
  )
}

function ProjectDatasetPanels({projectId}: {projectId: string}): JSX.Element {
  const {prefs, update} = usePrefs()
  const {data: datasets} = useDatasets({projectId})
  const [panel, setPanel] = useState<Panel>('drafts')
  const dataset = chooseDataset(datasets, projectId, prefs)

  if (!dataset) {
    return (
      <Card padding={4} radius={3} tone="transparent">
        <Text muted size={1}>
          This project has no datasets.
        </Text>
      </Card>
    )
  }

  return (
    <Stack gap={4}>
      <Flex align="center" gap={3} wrap="wrap">
        <Inline gap={2}>
          <Text size={1} muted>
            Dataset
          </Text>
          <Select
            fontSize={1}
            value={dataset}
            onChange={(event) =>
              update({
                datasetByProject: {
                  ...prefs.datasetByProject,
                  [projectId]: event.currentTarget.value,
                },
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
        <Box flex={1} />
        <Suspense fallback={<Button fontSize={1} mode="ghost" text="Open Studio" disabled />}>
          <OpenStudioButton projectId={projectId} dataset={dataset} />
        </Suspense>
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
            <ErrorBoundary fallback={(error) => <ErrorCard title={entry.label} error={error} />}>
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

function OpenStudioButton({projectId, dataset}: {projectId: string; dataset: string}): JSX.Element {
  const lookupStudio = useStudioLookup()
  const studio = lookupStudio(projectId, dataset)

  // Without a deployed Studio there is nowhere to send the user, so the button
  // becomes a plain disabled control rather than a link to nothing.
  if (!studio) return <Button fontSize={1} mode="ghost" text="No Studio deployed" disabled />

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
    <DocumentList
      rows={rows}
      projectId={projectId}
      dataset={dataset}
      emptyMessage={emptyMessage}
    />
  )
}
