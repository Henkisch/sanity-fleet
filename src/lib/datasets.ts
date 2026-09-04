/**
 * Which dataset Fleet reports on for a project.
 *
 * Listing a project's datasets requires the `sanity.project.datasets/read`
 * grant, which a user does not necessarily hold on every project they can read
 * content in — an admin of one organization can be a plain editor in another.
 * Making a card depend on that call means the card dies on projects where
 * Fleet would otherwise work perfectly.
 *
 * So the card path never lists datasets: it assumes the conventional name and
 * lets the content query be the thing that succeeds or fails. Listing is used
 * only in the project detail view, where it is optional chrome (a picker), not
 * a prerequisite.
 */
import {PREFERRED_DATASETS} from '../config'
import type {Prefs} from './prefs'

/** The dataset to query for a project without asking the API which exist. */
export function assumedDataset(projectId: string, prefs: Prefs): string {
  return prefs.datasetByProject[projectId] ?? PREFERRED_DATASETS[0]
}

/** The dataset to select once the real list is known. */
export function chooseDataset(
  available: readonly {name: string}[],
  projectId: string,
  prefs: Prefs,
): string | null {
  const names = available.map((dataset) => dataset.name)
  const chosen = prefs.datasetByProject[projectId]
  if (chosen && names.includes(chosen)) return chosen
  const preferred = PREFERRED_DATASETS.find((name) => names.includes(name))
  return preferred ?? names[0] ?? null
}
