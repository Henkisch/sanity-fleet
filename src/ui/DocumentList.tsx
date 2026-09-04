/**
 * A list of documents belonging to one project/dataset.
 *
 * Built as a table, like the project list: same row rhythm, same column
 * discipline, so moving between the two views does not feel like moving
 * between two applications.
 *
 * Fleet is read-only, so a row has exactly one action — open that document
 * where it can be edited. The whole row is the link; a column of identical
 * buttons down the right margin is noise.
 */
import { Box, Card, Flex, Text } from "@sanity/ui";
import type { JSX } from "react";
import { relativeTime } from "../lib/format";
import {
  publishedId,
  type DocumentRow,
  type DocumentStatus,
} from "../lib/queries";
import { manageUrl, studioDocumentUrl, useStudio } from "../lib/studios";
import { useIsMobile } from "../lib/useViewport";
import { StatusBadge } from "./primitives";

interface DocumentListProps {
  rows: readonly DocumentRow[];
  projectId: string;
  dataset: string;
  emptyMessage: string;
}

export function DocumentList({
  rows,
  projectId,
  dataset,
  emptyMessage,
}: DocumentListProps): JSX.Element {
  const studio = useStudio(projectId);
  const isMobile = useIsMobile();

  if (rows.length === 0) {
    return (
      <Card padding={4} radius={2} tone="transparent">
        <Text muted size={1}>
          {emptyMessage}
        </Text>
      </Card>
    );
  }

  return (
    <Card radius={3} shadow={1} style={{ overflow: "hidden" }}>
      <Box className="fleet-table-wrap">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>
                <Text size={1} muted weight="medium">
                  Document
                </Text>
              </th>
              {!isMobile && (
                <th>
                  <Text size={1} muted weight="medium">
                    Type
                  </Text>
                </th>
              )}
              <th className="fleet-table__num">
                <Text size={1} muted weight="medium">
                  Status
                </Text>
              </th>
              <th className="fleet-table__num">
                <Text size={1} muted weight="medium">
                  Edited
                </Text>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              // Drafts are addressed by their published id in Studio intents.
              const href = studio
                ? studioDocumentUrl(studio, publishedId(row._id), row._type)
                : manageUrl(projectId);

              return (
                <tr key={row._id} className="fleet-table__row">
                  <td>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="fleet-table__link"
                    >
                      <Text size={1} weight="medium" textOverflow="ellipsis">
                        {row.title}
                      </Text>
                    </a>
                  </td>

                  {!isMobile && (
                    <td>
                      <Text size={1} muted textOverflow="ellipsis">
                        {row._type}
                      </Text>
                    </td>
                  )}

                  <td className="fleet-table__num">
                    <Flex justify="flex-end">
                      <StatusBadge status={row.status} />
                    </Flex>
                  </td>

                  <td className="fleet-table__num">
                    <Text size={1} muted>
                      {relativeTime(row._updatedAt)}
                    </Text>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      <Box hidden aria-hidden="true">
        {dataset}
      </Box>
    </Card>
  );
}

export type { DocumentStatus };
