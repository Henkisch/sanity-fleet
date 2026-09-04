/**
 * Per-viewer preferences, persisted in localStorage.
 *
 * Fleet is read-only against Sanity, so nothing here belongs in the Content
 * Lake — these are local view settings. Every access is guarded: localStorage
 * throws in some browser configurations, and the app must still render.
 */

const KEY = 'sanity-fleet:prefs:v1'

export interface Prefs {
  /** Project ids the fleet view shows. Empty array means "all". */
  visibleProjects: string[]
  /** projectId -> dataset name chosen for that project. */
  datasetByProject: Record<string, string>
  /** A document is "stale" when untouched for this many days. */
  staleDays: number
  /** Only show projects that need attention. */
  attentionOnly: boolean
}

export const defaultPrefs: Prefs = {
  visibleProjects: [],
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
      visibleProjects: Array.isArray(parsed.visibleProjects) ? parsed.visibleProjects : [],
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
