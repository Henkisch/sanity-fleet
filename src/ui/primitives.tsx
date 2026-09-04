/**
 * Small presentational pieces shared by the fleet, project and cross-project
 * views. Sanity UI supplies the visual language; these add the few shapes it
 * has no direct equivalent for.
 */
import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import type {JSX, ReactNode} from 'react'

export type Health = 'ok' | 'attention' | 'unknown'

const HEALTH_COLOR: Record<Health, string> = {
  ok: 'var(--card-badge-positive-dot-color, #43d675)',
  attention: 'var(--card-badge-caution-dot-color, #f5a623)',
  unknown: 'var(--card-muted-fg-color, #9aa2ad)',
}

/** Coloured dot carrying the card's single health signal. */
export function StatusDot({health, title}: {health: Health; title: string}): JSX.Element {
  return (
    <span
      aria-label={title}
      title={title}
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: HEALTH_COLOR[health],
        display: 'inline-block',
        flex: 'none',
      }}
    />
  )
}

/**
 * Fixed-height stand-in for a card that is still loading.
 *
 * Height matches the loaded card so the grid does not reflow when signals
 * arrive — real-time updates make layout shift far more noticeable than in a
 * request/response app.
 */
export function CardSkeleton({height = 132}: {height?: number}): JSX.Element {
  return (
    <Card padding={4} radius={3} shadow={1} style={{height}}>
      <Stack gap={3}>
        <SkeletonLine width="60%" />
        <SkeletonLine width="85%" />
        <SkeletonLine width="45%" />
      </Stack>
    </Card>
  )
}

export function SkeletonLine({width = '100%'}: {width?: string}): JSX.Element {
  return (
    <Box
      style={{
        width,
        height: 12,
        borderRadius: 3,
        background: 'var(--card-skeleton-color-from, rgba(128,128,128,0.15))',
      }}
    />
  )
}

/**
 * Inline failure state for one fan-out unit.
 *
 * The API's own wording ("User is missing required grant
 * sanity.project.datasets/read") is accurate but not useful on a card, so the
 * common causes get a plain-language line and the raw message stays available
 * as a tooltip.
 */
export function UnavailableCard({
  title,
  subtitle,
  error,
}: {
  title: string
  subtitle?: string
  error: unknown
}): JSX.Element {
  const raw = error instanceof Error ? error.message : String(error)

  return (
    <Card padding={4} radius={3} shadow={1} tone="transparent" style={{height: '100%'}}>
      <Stack gap={3}>
        <Flex align="center" gap={3}>
          <Box flex={1}>
            <Stack gap={2}>
              <Text size={1} weight="semibold" textOverflow="ellipsis">
                {title}
              </Text>
              {subtitle && (
                <Text size={0} muted>
                  {subtitle}
                </Text>
              )}
            </Stack>
          </Box>
          <StatusDot health="unknown" title="Unavailable" />
        </Flex>
        <Text size={0} muted title={raw}>
          {explain(raw)}
        </Text>
        {corsFixUrl(raw) && (
          <Box>
            <Button
              as="a"
              href={corsFixUrl(raw) as string}
              target="_blank"
              rel="noreferrer"
              fontSize={0}
              mode="ghost"
              text="Allow this origin"
            />
          </Box>
        )}
      </Stack>
    </Card>
  )
}

/** Plain-language reading of the failures Fleet actually runs into. */
function explain(message: string): string {
  if (/CorsOriginError|not allowed to connect/i.test(message)) {
    return `This project does not allow ${window.location.origin} to read its content.`
  }
  if (/missing required grant|Unauthorized|Session not found/i.test(message)) {
    return 'No access — your role on this project cannot read this content.'
  }
  if (/dataset/i.test(message) && /not found|does not exist/i.test(message)) {
    return 'No dataset by that name. Open the project to pick another.'
  }
  return message
}

/**
 * A CORS failure names the exact Manage URL that fixes it. Pulling that link
 * out turns a dead card into a one-click repair, which matters when a fleet of
 * twenty projects each needs the origin added once.
 */
function corsFixUrl(message: string): string | null {
  const match = message.match(/https:\/\/[^\s]*cors=add[^\s]*/)
  return match ? match[0] : null
}

/**
 * One muted line for a project that could not be read in a cross-project list.
 *
 * A full error card per project would drown the results in a fleet where the
 * user is an editor on a handful of projects and a bystander on the rest — but
 * silently dropping them would misrepresent the list's coverage.
 */
export function InlineUnavailable({title, error}: {title: string; error: unknown}): JSX.Element {
  const raw = error instanceof Error ? error.message : String(error)
  return (
    <Text size={0} muted title={raw}>
      {title} — {explain(raw)}
    </Text>
  )
}

/** Compact failure state for a list section. */
export function ErrorCard({title, error}: {title: string; error: unknown}): JSX.Element {
  const raw = error instanceof Error ? error.message : String(error)
  return (
    <Card padding={4} radius={3} shadow={1} tone="caution">
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          {title}
        </Text>
        <Text size={0} muted title={raw}>
          {explain(raw)}
        </Text>
        {corsFixUrl(raw) && (
          <Box>
            <Button
              as="a"
              href={corsFixUrl(raw) as string}
              target="_blank"
              rel="noreferrer"
              fontSize={0}
              mode="ghost"
              text="Allow this origin"
            />
          </Box>
        )}
      </Stack>
    </Card>
  )
}

/** Label/value pair used in card footers and detail headers. */
export function Meta({label, children}: {label: string; children: ReactNode}): JSX.Element {
  return (
    <Flex align="center" gap={2}>
      <Text size={0} muted>
        {label}
      </Text>
      <Text size={0}>{children}</Text>
    </Flex>
  )
}
