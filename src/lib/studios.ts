/**
 * Resolving "open this document in its Studio".
 *
 * Two dead ends worth recording:
 *
 *   `useStudioWorkspacesByProjectIdDataset` (the SDK's own lookup) reads the
 *   Dashboard's organization context. Opened directly on localhost rather than
 *   inside the Dashboard iframe, it suspends and never settles.
 *
 *   The organization-level `/applications` endpoint returns nothing for these
 *   organizations: Studios are deployed per project, not owned by the org.
 *
 * What works is the per-project user-applications endpoint, which needs
 * `v2024-08-01` or later and no Dashboard context at all:
 *
 *   GET /v2024-08-01/projects/<projectId>/user-applications
 *
 * Resolution is async and never suspends — a row renders immediately and its
 * link upgrades when the lookup lands, because a Studio link is not worth
 * delaying the content it points at.
 */
import {useClient} from '@sanity/sdk-react'
import {useEffect, useState} from 'react'

export interface StudioTarget {
  url: string
  title: string
}

interface UserApplication {
  appHost: string
  type: string
  urlType: string
  title: string | null
}

const API_VERSION = 'v2024-08-01'

/** projectId -> in-flight or settled lookup. One request per project per session. */
const cache = new Map<string, Promise<StudioTarget | null>>()

/** Manage page for a project — the last resort when no Studio is deployed. */
export function manageUrl(projectId: string): string {
  return `https://www.sanity.io/manage/project/${projectId}`
}

function toUrl(app: UserApplication): string {
  const host = app.urlType === 'internal' ? `${app.appHost}.sanity.studio` : app.appHost
  return host.startsWith('http') ? host : `https://${host}`
}

/**
 * Deep link to one document in a Studio.
 *
 * The `intent/edit` route resolves through whatever desk structure the Studio
 * defines, so the link survives custom structures — unlike a structure path.
 */
export function studioDocumentUrl(
  studio: StudioTarget,
  documentId: string,
  documentType: string,
): string {
  const base = studio.url.replace(/\/$/, '')
  return `${base}/intent/edit/id=${encodeURIComponent(documentId)};type=${encodeURIComponent(documentType)}/`
}

/**
 * The Studio serving a project, or null when it has none deployed.
 * `undefined` while the lookup is still in flight.
 */
export function useStudio(projectId: string): StudioTarget | null | undefined {
  // Global scope matters: the default client is bound to the instance's
  // bootstrap project, and a project-scoped host answers /projects/<other-id>
  // requests with its *own* application list — every Studio link then points at
  // the same Studio.
  const client = useClient({apiVersion: API_VERSION, scope: 'global'})
  const [studio, setStudio] = useState<StudioTarget | null | undefined>(() =>
    cache.has(projectId) ? undefined : undefined,
  )

  useEffect(() => {
    let active = true

    let pending = cache.get(projectId)
    if (!pending) {
      pending = client
        .request<UserApplication[]>({uri: `/projects/${projectId}/user-applications`})
        .then((apps) => {
          const studios = (apps ?? []).filter((app) => app.type === 'studio')
          const chosen = studios[0]
          return chosen ? {url: toUrl(chosen), title: chosen.title || chosen.appHost} : null
        })
        // A missing Studio link must never break a row: treat any failure as
        // "no Studio" and let the caller fall back.
        .catch(() => null)
      cache.set(projectId, pending)
    }

    pending.then((result) => {
      if (active) setStudio(result)
    })

    return () => {
      active = false
    }
  }, [client, projectId])

  return studio
}
