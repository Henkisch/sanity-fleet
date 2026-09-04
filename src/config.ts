/**
 * App-level constants.
 *
 * Fleet queries every project explicitly (each `useQuery` carries its own
 * `projectId`/`dataset`), so the `SanityApp` config below is only a bootstrap
 * resource: it gives the SDK instance a default to fall back on. The project
 * id is required from the environment — set `SANITY_APP_BOOTSTRAP_PROJECT_ID`
 * (and optionally `SANITY_APP_BOOTSTRAP_DATASET`) in `.env`. See `.env.example`.
 */
import type {SanityConfig} from '@sanity/sdk'

const BOOTSTRAP_PROJECT_ID = process.env.SANITY_APP_BOOTSTRAP_PROJECT_ID ?? ''
const BOOTSTRAP_DATASET = process.env.SANITY_APP_BOOTSTRAP_DATASET ?? 'production'

export const bootstrapConfig: SanityConfig[] = [
  {projectId: BOOTSTRAP_PROJECT_ID, dataset: BOOTSTRAP_DATASET},
]

/** Dataset picked when a project has several and the user has expressed no preference. */
export const PREFERRED_DATASETS = ['production', 'prod', 'main']

/** Rows fetched per project in the cross-project and detail lists. */
export const LIST_LIMIT = 25

/** A project needs attention when it has at least this many drafts waiting. */
export const DRAFTS_ATTENTION_THRESHOLD = 1
