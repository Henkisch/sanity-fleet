/**
 * Per-viewer preferences, persisted in localStorage.
 *
 * Fleet is read-only against Sanity, so nothing here belongs in the Content
 * Lake — these are local view settings. Every access is guarded: localStorage
 * throws in some browser configurations, and the app must still render.
 */

const KEY = 'sanity-fleet:prefs:v1'

export interface Prefs {
  /**
   * Projects the user has hidden — test projects, deprecated ones, anything
   * they do not want counted in the daily view.
   *
   * A hide-list rather than an allow-list on purpose: a fleet gains projects
   * over time, and a new project should show up on its own rather than stay
   * invisible until someone remembers to permit it.
   */
  hiddenProjects: string[]
  /** Reveal hidden projects temporarily, without unhiding them. */
  showHidden: boolean
  /** Organizations whose project list is unfolded in the rail. */
  expandedOrgs: string[]
  /**
   * Projects pinned to the top of every list.
   *
   * Pinning rather than manual drag-ordering: rows here are ordered by data
   * (drafts, staleness, name) and re-sort as that data changes, so a
   * hand-dragged order would be thrown away by the next sort. A pin survives
   * every sort because it is applied on top of one.
   */
  pinnedProjects: string[]
  /** projectId -> dataset name chosen for that project. */
  datasetByProject: Record<string, string>
  /** A document is "stale" when untouched for this many days. */
  staleDays: number
  /** Only show projects that need attention. */
  attentionOnly: boolean
}

export const defaultPrefs: Prefs = {
  hiddenProjects: [],
  showHidden: false,
  expandedOrgs: [],
  pinnedProjects: [],
  datasetByProject: {},
  staleDays: 90,
  attentionOnly: false,
}

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultPrefs
    const parsed = JSON.parse(raw) as Partial<Prefs>
    return {
      hiddenProjects: Array.isArray(parsed.hiddenProjects) ? parsed.hiddenProjects : [],
      showHidden: parsed.showHidden === true,
      expandedOrgs: Array.isArray(parsed.expandedOrgs) ? parsed.expandedOrgs : [],
      pinnedProjects: Array.isArray(parsed.pinnedProjects) ? parsed.pinnedProjects : [],
      datasetByProject:
        parsed.datasetByProject && typeof parsed.datasetByProject === 'object'
          ? parsed.datasetByProject
          : {},
      staleDays: typeof parsed.staleDays === 'number' ? parsed.staleDays : defaultPrefs.staleDays,
      attentionOnly: parsed.attentionOnly === true,
    }
  } catch {
    return defaultPrefs
  }
}

export function writePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Storage unavailable — preferences stay in memory for this session only.
  }
}
