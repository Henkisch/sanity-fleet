/**
 * View preferences shared across the app.
 *
 * Kept in React state (mirrored to localStorage) rather than in the Content
 * Lake: these are per-viewer view settings, and Fleet never writes to Sanity.
 */
import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react'
import {defaultPrefs, readPrefs, writePrefs, type Prefs} from './prefs'

interface PrefsContextValue {
  prefs: Prefs
  update: (patch: Partial<Prefs>) => void
  /** Hide or reveal one project, persisted. */
  setHidden: (projectId: string, hidden: boolean) => void
  /** Fold or unfold one organization in the rail, persisted. */
  toggleOrg: (organizationId: string) => void
  /** Pin or unpin one project, persisted. */
  togglePin: (projectId: string) => void
}

// The default is never used in practice: PrefsProvider wraps every view. It
// exists so the context has a shape, and its update is intentionally inert.
const noop = (): void => undefined

const PrefsContext = createContext<PrefsContextValue>({
  prefs: defaultPrefs,
  update: noop,
  setHidden: noop,
  toggleOrg: noop,
  togglePin: noop,
})

export function PrefsProvider({children}: {children: ReactNode}) {
  const [prefs, setPrefs] = useState<Prefs>(readPrefs)

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = {...current, ...patch}
      writePrefs(next)
      return next
    })
  }, [])

  const setHidden = useCallback(
    (projectId: string, hidden: boolean) => {
      setPrefs((current) => {
        const without = current.hiddenProjects.filter((id) => id !== projectId)
        const next = {
          ...current,
          hiddenProjects: hidden ? [...without, projectId] : without,
        }
        writePrefs(next)
        return next
      })
    },
    [],
  )

  const toggleOrg = useCallback((organizationId: string) => {
    setPrefs((current) => {
      const expanded = current.expandedOrgs.includes(organizationId)
      const next = {
        ...current,
        expandedOrgs: expanded
          ? current.expandedOrgs.filter((id) => id !== organizationId)
          : [...current.expandedOrgs, organizationId],
      }
      writePrefs(next)
      return next
    })
  }, [])

  const togglePin = useCallback((projectId: string) => {
    setPrefs((current) => {
      const pinned = current.pinnedProjects.includes(projectId)
      const next = {
        ...current,
        pinnedProjects: pinned
          ? current.pinnedProjects.filter((id) => id !== projectId)
          : [...current.pinnedProjects, projectId],
      }
      writePrefs(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({prefs, update, setHidden, toggleOrg, togglePin}),
    [prefs, update, setHidden, toggleOrg, togglePin],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsContextValue {
  return useContext(PrefsContext)
}
