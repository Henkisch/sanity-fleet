/**
 * A list of documents belonging to one project/dataset.
 *
 * Fleet is read-only, so a row has exactly one action: open that document
 * where it can be edited. The whole row is the link — the point of the app is
 * getting into the right document quickly, and a row of identical buttons down
 * the right margin is noise.
 */
import {Box, Card, Flex, Stack, Text} from '@sanity/ui'
import type {JSX} from 'react'
import {relativeTime} from '../lib/format'
import {publishedId, type DocumentRow} from '../lib/queries'
import {manageUrl, studioDocumentUrl, useStudio} from '../lib/studios'

interface DocumentListProps {
  rows: readonly DocumentRow[]
  projectId: string
  dataset: string
  emptyMessage: string
}

export function DocumentList({
  rows,
  projectId,
  dataset,
  emptyMessage,
}: DocumentListProps): JSX.Element {
  const studio = useStudio(projectId)

  if (rows.length === 0) {
    return (
      <Card padding={4} radius={2} tone="transparent">
        <Text muted size={1}>
          {emptyMessage}
        </Text>
      </Card>
    )
  }

  return (
    <Stack gap={1}>
      {rows.map((row) => (
        <DocumentRowLink key={row._id} row={row} projectId={projectId} studio={studio} />
      ))}
    </Stack>
  )
}

function DocumentRowLink({
  row,
  projectId,
  studio,
}: {
  row: DocumentRow
  projectId: string
  studio: ReturnType<typeof useStudio>
}): JSX.Element {
  // Drafts are addressed by their published id in Studio intents.
  const href = studio
    ? studioDocumentUrl(studio, publishedId(row._id), row._type)
    : manageUrl(projectId)

  return (
    <Card
      as="a"
      href={href}
      target="_blank"
      rel="noreferrer"
      padding={3}
      radius={2}
      tone="transparent"
      style={{textDecoration: 'none', display: 'block'}}
    >
      <Flex align="center" gap={3}>
        <Box flex={1} style={{minWidth: 0}}>
          <Stack gap={2}>
            <Text size={1} textOverflow="ellipsis">
              {row.title}
            </Text>
            <Text size={0} muted>
              {row._type} · {relativeTime(row._updatedAt)}
              {row._id.startsWith('drafts.') ? ' · draft' : ''}
            </Text>
          </Stack>
        </Box>
        <Text size={0} muted>
          {studio === undefined ? '' : studio ? '↗ Studio' : '↗ Manage'}
        </Text>
      </Flex>
    </Card>
  )
}
