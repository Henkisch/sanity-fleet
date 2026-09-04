/**
 * The project list for whatever scope is selected.
 *
 * A table rather than cards: the question is comparative — who has the most
 * drafts waiting, what has gone longest untouched — and ranking eighteen
 * projects is what a sortable column does well and a grid of cards does not.
 *
 * On a phone the filters fold behind a disclosure. They are refinements to a
 * view, and a screen's worth of controls above the data defeats the point of
 * opening the app.
 */
import {ControlsIcon} from '@sanity/icons/Controls'
import {RefreshIcon} from '@sanity/icons/Refresh'
import {SearchIcon} from '@sanity/icons/Search'
import {useProjects} from '@sanity/sdk-react'
import {Box, Button, Card, Flex, Select, Stack, Text, TextInput} from '@sanity/ui'
import {useState, type JSX} from 'react'
import {usePrefs} from '../lib/PrefsContext'
import type {QueryableProject} from '../lib/projects'
import {useIsMobile} from '../lib/useViewport'
import {ProjectTable} from './ProjectTable'
import {SignalsProvider} from './SignalsStore'

interface FleetViewProps {
  projects: QueryableProject[]
  onOpenProject: (projectId: string) => void
}

export function FleetView({projects, onOpenProject}: FleetViewProps): JSX.Element {
  const {prefs, update} = usePrefs()
  const {isFetching, refetch} = useProjects()
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // A filter that is doing something stays visible even when folded away, so
  // a narrowed list is never silently unexplained.
  const active = filter.length > 0 || prefs.attentionOnly

  const filterField = (
    <Box style={isMobile ? undefined : {width: 300}}>
      <TextInput
        fontSize={1}
        icon={SearchIcon}
        placeholder="Filter projects"
        radius={2}
        value={filter}
        onChange={(event) => setFilter(event.currentTarget.value)}
        onClear={() => setFilter('')}
        clearButton={filter.length > 0}
      />
    </Box>
  )

  const settings = (
    <>
      {/* A toggle rather than a checkbox: it sits among buttons and selects,
          and a lone checkbox on a toolbar reads as an unfinished form. */}
      <Button
        fontSize={1}
        padding={3}
        mode={prefs.attentionOnly ? 'default' : 'ghost'}
        tone={prefs.attentionOnly ? 'primary' : 'default'}
        text="Needs attention"
        aria-pressed={prefs.attentionOnly}
        onClick={() => update({attentionOnly: !prefs.attentionOnly})}
      />

      <Flex align="center" gap={2}>
        <Text size={1} muted>
          Stale after
        </Text>
        <Box style={{width: 116}}>
          {/* Sets the cutoff for the Stale column and the Stale view: a
              published document untouched for longer than this. */}
          <Select
            fontSize={1}
            padding={3}
            title="A published document counts as stale once it has gone this long without an edit"
            value={String(prefs.staleDays)}
            onChange={(event) => update({staleDays: Number(event.currentTarget.value)})}
          >
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
            <option value="365">365 days</option>
          </Select>
        </Box>
      </Flex>
    </>
  )

  return (
    <SignalsProvider projects={projects}>
      <Card radius={3} shadow={1} style={{overflow: 'hidden'}}>
        <Card borderBottom paddingLeft={3} paddingRight={0} paddingY={2} tone="transparent">
          {isMobile ? (
            <Stack gap={2}>
              <Flex align="center" gap={2}>
                <Button
                  fontSize={1}
                  padding={3}
                  mode={active ? 'default' : 'ghost'}
                  tone={active ? 'primary' : 'default'}
                  icon={ControlsIcon}
                  text="Filters"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((open) => !open)}
                />
                <Box flex={1} />
                <Button
                  fontSize={1}
                  padding={3}
                  mode="bleed"
                  icon={RefreshIcon}
                  aria-label="Refresh"
                  disabled={isFetching}
                  onClick={() => refetch()}
                />
              </Flex>

              {filtersOpen && (
                <Stack gap={3}>
                  {filterField}
                  {settings}
                </Stack>
              )}
            </Stack>
          ) : (
            <Flex align="center" gap={2}>
              {filterField}
              <Box flex={1} />
              {settings}
              <Button
                fontSize={1}
                padding={3}
                mode="bleed"
                icon={RefreshIcon}
                text={isFetching ? 'Refreshing…' : 'Refresh'}
                disabled={isFetching}
                onClick={() => refetch()}
              />
            </Flex>
          )}
        </Card>

        <ProjectTable projects={projects} filter={filter} onOpenProject={onOpenProject} />
      </Card>
    </SignalsProvider>
  )
}
