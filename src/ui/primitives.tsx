/**
 * Small presentational pieces shared by the fleet, project and cross-project
 * views. Sanity UI supplies the visual language; these add the few shapes it
 * has no direct equivalent for.
 */
import {Box, Card, Flex, Stack, Text} from '@sanity/ui'
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

/** Inline error state for one fan-out unit, so a failing project cannot blank the view. */
export function ErrorCard({title, error}: {title: string; error: unknown}): JSX.Element {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <Card padding={4} radius={3} shadow={1} tone="critical">
      <Stack gap={3}>
        <Text size={1} weight="semibold">
          {title}
        </Text>
        <Text size={0} muted>
          {message}
        </Text>
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
