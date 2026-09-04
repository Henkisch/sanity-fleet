/**
 * One project's card in the fleet grid.
 *
 * Split into three components on purpose: the App SDK's data hooks suspend, and
 * the best-practice rule is one fetching hook per component so that a refetch
 * of the datasets list cannot put the signals query back into a loading state.
 *
 *   ProjectCard          no fetching — owns the error boundary and skeleton
 *   ProjectCardDataset   useDatasets — resolves which dataset to report on
 *   ProjectCardSignals   useQuery    — the counts themselves
 */
import {useDatasets, useQuery} from '@sanity/sdk-react'
import {Box, Card, Flex, Inline, Stack, Text} from '@sanity/ui'
import {Suspense, type JSX} from 'react'
import {DRAFTS_ATTENTION_THRESHOLD} from '../config'
import {chooseDataset, usePrefs} from '../lib/PrefsContext'
import {formatCount, relativeTime, staleBefore} from '../lib/format'
import {SIGNALS_QUERY, type ProjectSignals} from '../lib/queries'
import {ErrorBoundary} from '../ui/ErrorBoundary'
import {CardSkeleton, ErrorCard, StatusDot, type Health} from '../ui/primitives'

export interface FleetProject {
  id: string
  displayName: string
  organizationId: string
}

interface ProjectCardProps {
  project: FleetProject
  onOpen: (projectId: string) => void
}

export function ProjectCard({project, onOpen}: ProjectCardProps): JSX.Element {
  return (
    <ErrorBoundary fallback={(error) => <ErrorCard title={project.displayName} error={error} />}>
      <Suspense fallback={<CardSkeleton />}>
        <ProjectCardDataset project={project} onOpen={onOpen} />
      </Suspense>
    </ErrorBoundary>
  )
}

function ProjectCardDataset({project, onOpen}: ProjectCardProps): JSX.Element {
  const {prefs} = usePrefs()
  const {data: datasets} = useDatasets({projectId: project.id})
  const dataset = chooseDataset(datasets, project.id, prefs)

  if (!dataset) {
    return (
      <CardFrame onClick={() => onOpen(project.id)}>
        <Header project={project} dataset="no datasets" health="unknown" title="No datasets" />
        <Text size={1} muted>
          This project has no datasets yet.
        </Text>
      </CardFrame>
    )
  }

  return (
    <Suspense fallback={<CardSkeleton />}>
      <ProjectCardSignals project={project} dataset={dataset} onOpen={onOpen} />
    </Suspense>
  )
}

function ProjectCardSignals({
  project,
  dataset,
  onOpen,
}: ProjectCardProps & {dataset: string}): JSX.Element | null {
  const {prefs} = usePrefs()
  const {data} = useQuery<ProjectSignals>({
    query: SIGNALS_QUERY,
    params: {staleBefore: staleBefore(prefs.staleDays)},
    projectId: project.id,
    dataset,
    // Drafts live alongside published documents; the raw perspective is the
    // only one that can count both in a single query.
    perspective: 'raw',
  })

  const health = healthOf(data)

  // The filter is applied here rather than in the grid: signals only exist
  // once each card has loaded, so the card is the only place that knows
  // whether this project needs attention.
  if (prefs.attentionOnly && health !== 'attention') return null

  return (
    <CardFrame onClick={() => onOpen(project.id)}>
      <Header
        project={project}
        dataset={dataset}
        health={health}
        title={health === 'attention' ? 'Drafts waiting' : 'Nothing waiting'}
      />
      <Inline gap={3}>
        <Text size={1} weight={data.drafts > 0 ? 'semibold' : undefined}>
          {formatCount(data.drafts)} drafts
        </Text>
        <Text size={1} muted>
          {formatCount(data.stale)} stale
        </Text>
        <Text size={1} muted>
          {formatCount(data.total)} docs
        </Text>
      </Inline>
      <Text size={0} muted textOverflow="ellipsis">
        {data.lastEdited
          ? `Last edit ${relativeTime(data.lastEdited._updatedAt)} · ${data.lastEdited.title}`
          : 'No documents yet'}
      </Text>
    </CardFrame>
  )
}

/** Drafts are the actionable signal; staleness is context, not an alarm. */
function healthOf(signals: ProjectSignals): Health {
  if (signals.total === 0) return 'unknown'
  return signals.drafts >= DRAFTS_ATTENTION_THRESHOLD ? 'attention' : 'ok'
}

function CardFrame({onClick, children}: {onClick: () => void; children: React.ReactNode}) {
  return (
    <Card
      as="button"
      onClick={onClick}
      padding={4}
      radius={3}
      shadow={1}
      style={{textAlign: 'left', width: '100%', height: '100%', cursor: 'pointer'}}
    >
      <Stack gap={3}>{children}</Stack>
    </Card>
  )
}

function Header({
  project,
  dataset,
  health,
  title,
}: {
  project: FleetProject
  dataset: string
  health: Health
  title: string
}) {
  return (
    <Flex align="center" gap={3}>
      <Box flex={1}>
        <Stack gap={2}>
          <Text size={1} weight="semibold" textOverflow="ellipsis">
            {project.displayName}
          </Text>
          <Text size={0} muted>
            {dataset}
          </Text>
        </Stack>
      </Box>
      <StatusDot health={health} title={title} />
    </Flex>
  )
}
