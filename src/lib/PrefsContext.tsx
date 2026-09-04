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
}

// The default is never used in practice: PrefsProvider wraps every view. It
// exists so the context has a shape, and its update is intentionally inert.
const noop = (): void => undefined

const PrefsContext = createContext<PrefsContextValue>({prefs: defaultPrefs, update: noop})

export function PrefsProvider({children}: {children: ReactNode}) {
  const [prefs, setPrefs] = useState<Prefs>(readPrefs)

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = {...current, ...patch}
      writePrefs(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({prefs, update}), [prefs, update])

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsContextValue {
  return useContext(PrefsContext)
}
