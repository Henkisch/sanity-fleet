/**
 * The navigation rail: which projects exist, and where you are.
 *
 * The rail answers "what" only. Views over content (drafts, stale) are not
 * destinations here — they are a lens on whatever is selected, and live with
 * the content instead. That keeps the rail a stable list of places.
 *
 * Organizations start folded. Twenty project names is a wall on arrival, and
 * an overview app should open on the overview, not on its own index. Fold state
 * persists, so the projects someone works in daily stay one click away.
 */
import {ChevronDownIcon} from '@sanity/icons/ChevronDown'
import {ChevronRightIcon} from '@sanity/icons/ChevronRight'
import {EyeClosedIcon} from '@sanity/icons/EyeClosed'
import {EyeOpenIcon} from '@sanity/icons/EyeOpen'
import {ThLargeIcon} from '@sanity/icons/ThLarge'
import {Box, Card, Flex, Stack, Text} from '@sanity/ui'
import type {JSX, ReactNode} from 'react'
import type {QueryableProject} from '../lib/projects'
import type {Route} from '../routes'

interface OrgGroup {
  id: string
  name: string
  projects: QueryableProject[]
}

interface SidebarProps {
  organizations: OrgGroup[]
  hidden: QueryableProject[]
  expandedOrgs: string[]
  showHidden: boolean
  onToggleOrg: (organizationId: string) => void
  onToggleShowHidden: (show: boolean) => void
  onSetHidden: (projectId: string, hidden: boolean) => void
  route: Route
  navigate: (route: Route) => void
}

export function Sidebar({
  organizations,
  hidden,
  expandedOrgs,
  showHidden,
  onToggleOrg,
  onToggleShowHidden,
  onSetHidden,
  route,
  navigate,
}: SidebarProps): JSX.Element {
  const activeProjectId = route.scope.kind === 'project' ? route.scope.id : null
  const activeOrgId = route.scope.kind === 'organization' ? route.scope.id : null

  return (
    <Stack gap={4} paddingY={3} paddingX={2}>
      <NavItem
        icon={<ThLargeIcon />}
        label="All projects"
        selected={route.scope.kind === 'all'}
        onClick={() => navigate({scope: {kind: 'all'}, view: route.view})}
      />

      {organizations.map((org) => {
        const expanded = expandedOrgs.includes(org.id)

        return (
          <Stack key={org.id} gap={1}>
            <NavItem
              icon={expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
              label={org.name}
              badge={String(org.projects.length)}
              selected={activeOrgId === org.id}
              onIconClick={() => onToggleOrg(org.id)}
              onClick={() => {
                if (!expanded) onToggleOrg(org.id)
                navigate({scope: {kind: 'organization', id: org.id}, view: route.view})
              }}
            />

            {expanded &&
              org.projects.map((project) => (
                <NavItem
                  key={project.id}
                  label={project.displayName}
                  indented
                  selected={activeProjectId === project.id}
                  onClick={() =>
                    navigate({scope: {kind: 'project', id: project.id}, view: route.view})
                  }
                  action={{
                    icon: <EyeClosedIcon />,
                    title: `Hide ${project.displayName}`,
                    onClick: () => onSetHidden(project.id, true),
                  }}
                />
              ))}
          </Stack>
        )
      })}

      {hidden.length > 0 && (
        <Stack gap={1}>
          <NavItem
            icon={showHidden ? <EyeOpenIcon /> : <EyeClosedIcon />}
            label="Hidden"
            badge={String(hidden.length)}
            muted
            selected={false}
            onClick={() => onToggleShowHidden(!showHidden)}
          />
          {showHidden &&
            hidden.map((project) => (
              <NavItem
                key={project.id}
                label={project.displayName}
                indented
                muted
                selected={activeProjectId === project.id}
                onClick={() =>
                  navigate({scope: {kind: 'project', id: project.id}, view: route.view})
                }
                action={{
                  icon: <EyeOpenIcon />,
                  title: `Show ${project.displayName} again`,
                  onClick: () => onSetHidden(project.id, false),
                }}
              />
            ))}
        </Stack>
      )}
    </Stack>
  )
}

interface NavAction {
  icon: ReactNode
  title: string
  onClick: () => void
}

function NavItem({
  icon,
  label,
  badge,
  selected,
  muted,
  indented,
  onClick,
  onIconClick,
  action,
}: {
  icon?: ReactNode
  label: string
  badge?: string
  selected: boolean
  muted?: boolean
  indented?: boolean
  onClick: () => void
  /** When set, the icon toggles instead of navigating (fold without moving). */
  onIconClick?: () => void
  action?: NavAction
}) {
  return (
    <Card
      padding={0}
      radius={2}
      tone={selected ? 'primary' : 'default'}
      pressed={selected}
      className="nav-item"
      style={{background: selected ? undefined : 'transparent'}}
    >
      <Flex align="center">
        {icon && (
          <Box
            as={onIconClick ? 'button' : 'div'}
            onClick={
              onIconClick
                ? (event: React.MouseEvent) => {
                    event.stopPropagation()
                    onIconClick()
                  }
                : undefined
            }
            paddingLeft={2}
            paddingRight={1}
            paddingY={2}
            style={{
              background: 'transparent',
              border: 0,
              color: 'inherit',
              cursor: onIconClick ? 'pointer' : 'inherit',
              lineHeight: 0,
            }}
          >
            <Text size={1} muted={!selected}>
              {icon}
            </Text>
          </Box>
        )}

        {/*
          The row and its action are separate controls: a button inside a
          button is invalid and the inner one never receives the click.
        */}
        <Box
          as="button"
          flex={1}
          onClick={onClick}
          paddingY={2}
          paddingLeft={icon ? 1 : indented ? 5 : 3}
          paddingRight={action ? 1 : 2}
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            textAlign: 'left',
            minWidth: 0,
            font: 'inherit',
            color: 'inherit',
          }}
        >
          <Flex align="center" gap={2}>
            <Box flex={1} style={{minWidth: 0}}>
              <Text
                size={1}
                muted={muted && !selected}
                weight={selected ? 'medium' : undefined}
                textOverflow="ellipsis"
              >
                {label}
              </Text>
            </Box>
            {badge && (
              <Text size={0} muted>
                {badge}
              </Text>
            )}
          </Flex>
        </Box>

        {action && (
          <Box
            as="button"
            onClick={action.onClick}
            title={action.title}
            aria-label={action.title}
            className="nav-item__action"
            paddingX={2}
            paddingY={2}
            style={{
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              color: 'inherit',
              lineHeight: 0,
            }}
          >
            <Text size={1} muted>
              {action.icon}
            </Text>
          </Box>
        )}
      </Flex>
    </Card>
  )
}
