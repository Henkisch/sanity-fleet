/**
 * A list of documents belonging to one project/dataset, with a jump-out link
 * per row.
 *
 * Fleet is read-only: a row's only action is to open the document where it can
 * actually be edited, which is its project's Studio.
 */
import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import type {JSX} from 'react'
import {relativeTime} from '../lib/format'
import {publishedId, type DocumentRow} from '../lib/queries'
import {manageUrl, studioDocumentUrl, useStudioLookup} from '../lib/studios'

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
  const lookupStudio = useStudioLookup()
  const studio = lookupStudio(projectId, dataset)

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
      {rows.map((row) => {
        // Drafts are addressed by their published id in Studio intents.
        const targetId = publishedId(row._id)
        const href = studio
          ? studioDocumentUrl(studio, targetId, row._type)
          : manageUrl(projectId)

        return (
          <Card key={row._id} padding={3} radius={2} tone="transparent">
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
              <Button
                as="a"
                href={href}
                target="_blank"
                rel="noreferrer"
                fontSize={1}
                mode="ghost"
                text={studio ? 'Open in Studio' : 'Open in Manage'}
              />
            </Flex>
          </Card>
        )
      })}
    </Stack>
  )
}
