/**
 * Resolving "open this in its Studio".
 *
 * A project's Studio is not a property of the project: `studioHost` is
 * deprecated and cannot describe a project with several deployed studios. The
 * SDK exposes the deployment index keyed by `projectId:dataset`, which is
 * exactly the lookup Fleet needs.
 *
 * `useStudioWorkspacesByProjectIdDataset` is marked `@internal` in the SDK.
 * Every consumer here treats a miss as normal and falls back to the project's
 * Manage page, so an API change degrades the link rather than breaking a view.
 */
import {useStudioWorkspacesByProjectIdDataset} from '@sanity/sdk-react'
import {useCallback} from 'react'

export interface StudioTarget {
  url: string
  title: string
}

/** Manage page for a project — always reachable, even with no Studio deployed. */
export function manageUrl(projectId: string): string {
  return `https://www.sanity.io/manage/project/${projectId}`
}

/**
 * Deep link to one document in a Studio.
 *
 * Uses the `intent/edit` route rather than a structure path: intents resolve
 * through whatever desk structure the Studio defines, so the link survives
 * custom structures.
 */
export function studioDocumentUrl(studio: StudioTarget, documentId: string, documentType: string): string {
  const base = studio.url.replace(/\/$/, '')
  return `${base}/intent/edit/id=${encodeURIComponent(documentId)};type=${encodeURIComponent(documentType)}/`
}

/**
 * Lookup from a project/dataset pair to the Studio that serves it.
 *
 * Suspends on first call, so components using it need a Suspense boundary.
 */
export function useStudioLookup(): (projectId: string, dataset: string) => StudioTarget | null {
  const {workspacesByProjectIdAndDataset} = useStudioWorkspacesByProjectIdDataset()

  return useCallback(
    (projectId: string, dataset: string) => {
      const workspaces = workspacesByProjectIdAndDataset[`${projectId}:${dataset}`]
      const workspace = workspaces?.[0]
      if (!workspace?.url) return null
      return {url: workspace.url, title: workspace.title || workspace.name}
    },
    [workspacesByProjectIdAndDataset],
  )
}
