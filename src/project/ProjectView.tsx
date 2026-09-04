/**
 * One project's overview: which dataset is being reported on, a way into its
 * Studio, and what changed recently.
 *
 * Drafts and stale documents for this project are reachable through the view
 * tabs above, scoped to it — so this panel does not repeat them.
 */
import {useDatasets, useQuery} from '@sanity/sdk-react'
import {Box, Button, Flex, Inline, Select, Stack, Text} from '@sanity/ui'
import {Suspense, type JSX} from 'react'
import {LIST_LIMIT} from '../config'
import {assumedDataset, chooseDataset} from '../lib/datasets'
import {usePrefs} from '../lib/PrefsContext'
import {staleBefore} from '../lib/format'
import {RECENT_QUERY, type DocumentRow} from '../lib/queries'
import {manageUrl, useStudio} from '../lib/studios'
import {DocumentList} from '../ui/DocumentList'
import {ErrorBoundary} from '../ui/ErrorBoundary'
import {CardSkeleton, UnavailableCard} from '../ui/primitives'

export function ProjectView({projectId}: {projectId: string}): JSX.Element {
  const {prefs} = usePrefs()
  const dataset = assumedDataset(projectId, prefs)

  return (
    <Stack gap={4}>
      <Flex align="center" gap={3} wrap="wrap">
        <ErrorBoundary fallback={() => <DatasetLabel dataset={dataset} />}>
          <Suspense fallback={<DatasetLabel dataset={dataset} />}>
            <DatasetPicker projectId={projectId} />
          </Suspense>
        </ErrorBoundary>

        <Box flex={1} />

        <OpenStudioButton projectId={projectId} />
        <Button
          as="a"
          href={manageUrl(projectId)}
          target="_blank"
          rel="noreferrer"
          fontSize={1}
          mode="bleed"
          text="Manage"
        />
      </Flex>

      <ErrorBoundary
        resetKey={`${projectId}:${dataset}`}
        fallback={(error) => (
          <UnavailableCard title="Recent activity" subtitle={dataset} error={error} />
        )}
      >
        <Suspense fallback={<CardSkeleton height={180} />}>
          <RecentRows projectId={projectId} dataset={dataset} />
        </Suspense>
      </ErrorBoundary>
    </Stack>
  )
}

function DatasetLabel({dataset}: {dataset: string}) {
  return (
    <Inline gap={2}>
      <Text size={1} muted>
        Dataset
      </Text>
      <Text size={1}>{dataset}</Text>
    </Inline>
  )
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
  // and becomes a link — it never blocks the content behind it.
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
      text="Open Studio"
    />
  )
}

function RecentRows({projectId, dataset}: {projectId: string; dataset: string}): JSX.Element {
  const {prefs} = usePrefs()
  const {data: rows} = useQuery<DocumentRow[]>({
    query: RECENT_QUERY,
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
      emptyMessage="No documents yet."
    />
  )
}
