/**
 * One project's card in the fleet grid.
 *
 * The card runs exactly one data hook. It deliberately does not list the
 * project's datasets first: that call needs a grant many users lack on projects
 * they can otherwise read, and a card that dies on a permissions technicality
 * is worse than one that assumes `production` and reports what it finds. See
 * `src/lib/datasets.ts`.
 */
import {useQuery} from '@sanity/sdk-react'
import {Box, Card, Flex, Stack, Text} from '@sanity/ui'
import {Suspense, type JSX, type ReactNode} from 'react'
import {DRAFTS_ATTENTION_THRESHOLD} from '../config'
import {assumedDataset} from '../lib/datasets'
import {usePrefs} from '../lib/PrefsContext'
import {formatCount, relativeTime, staleBefore} from '../lib/format'
import {SIGNALS_QUERY, type ProjectSignals} from '../lib/queries'
import {ErrorBoundary} from '../ui/ErrorBoundary'
import {CardSkeleton, StatusDot, UnavailableCard, type Health} from '../ui/primitives'

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
  const {prefs} = usePrefs()
  const dataset = assumedDataset(project.id, prefs)

  return (
    <ErrorBoundary
      // Remounting on a dataset change is intended: a new dataset deserves a
      // fresh attempt rather than the previous one's error.
      resetKey={`${project.id}:${dataset}`}
      fallback={(error) => (
        <UnavailableCard title={project.displayName} subtitle={dataset} error={error} />
      )}
    >
      <Suspense fallback={<CardSkeleton />}>
        <ProjectCardSignals project={project} dataset={dataset} onOpen={onOpen} />
      </Suspense>
    </ErrorBoundary>
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
  const needsAttention = health === 'attention'

  // The filter is applied here rather than in the grid: signals only exist once
  // the card has loaded, so the card is the only place that knows whether this
  // project needs attention.
  if (prefs.attentionOnly && !needsAttention) return null

  return (
    <CardFrame onClick={() => onOpen(project.id)} needsAttention={needsAttention}>
      <Header project={project} dataset={dataset} health={health} />
      <Text size={1} weight={needsAttention ? 'semibold' : undefined} muted={!needsAttention}>
        {data.drafts > 0
          ? `${formatCount(data.drafts)} draft${data.drafts === 1 ? '' : 's'} waiting`
          : 'Nothing waiting'}
      </Text>
      <Text size={0} muted textOverflow="ellipsis">
        {[
          `${formatCount(data.stale)} stale of ${formatCount(data.total)}`,
          data.lastEdited ? `edited ${relativeTime(data.lastEdited._updatedAt)}` : 'no documents',
        ].join(' · ')}
      </Text>
    </CardFrame>
  )
}

/** Drafts are the actionable signal; staleness is context, not an alarm. */
function healthOf(signals: ProjectSignals): Health {
  if (signals.total === 0) return 'unknown'
  return signals.drafts >= DRAFTS_ATTENTION_THRESHOLD ? 'attention' : 'ok'
}

function CardFrame({
  onClick,
  needsAttention = false,
  children,
}: {
  onClick: () => void
  needsAttention?: boolean
  children: ReactNode
}) {
  return (
    <Card
      as="button"
      onClick={onClick}
      padding={3}
      radius={3}
      shadow={1}
      style={{
        textAlign: 'left',
        width: '100%',
        cursor: 'pointer',
        minWidth: 0,
        // Grid order, not a sort in the parent: a card's signals are only known
        // after it has loaded, and lifting them into the grid would mean
        // holding every project's data in one component and losing the
        // per-project Suspense that keeps a slow project from blocking the rest.
        order: needsAttention ? 0 : 1,
        opacity: needsAttention ? 1 : 0.66,
      }}
    >
      <Stack gap={3}>{children}</Stack>
    </Card>
  )
}

function Header({
  project,
  dataset,
  health,
}: {
  project: FleetProject
  dataset: string
  health: Health
}) {
  return (
    <Flex align="center" gap={3}>
      <Box flex={1} style={{minWidth: 0}}>
        <Stack gap={2}>
          <Text size={1} weight="semibold" textOverflow="ellipsis">
            {project.displayName}
          </Text>
          <Text size={0} muted>
            {dataset}
          </Text>
        </Stack>
      </Box>
      <StatusDot
        health={health}
        title={health === 'attention' ? 'Drafts waiting' : 'Nothing waiting'}
      />
    </Flex>
  )
}
