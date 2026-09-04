import {defineCliConfig} from 'sanity/cli'

/*
 * The organization id lives in the environment rather than in the repo. It is
 * a public identifier, not a secret — this only keeps it out of git history.
 * See `.env.example`.
 */
const organizationId = process.env.SANITY_APP_ORGANIZATION_ID

/*
 * The deployment this repo pushes to. Kept out of the file for the same reason
 * as the organization id, and for one more: a fork must deploy to its OWN app.
 * Leave it unset and `sanity deploy` creates one, then prints the id to store.
 */
const appId = process.env.SANITY_APP_DEPLOYMENT_ID

if (!organizationId) {
  // Not thrown: `sanity build` should still run for someone who has just
  // cloned. Deploy is the command that genuinely needs it.
  console.warn('SANITY_APP_ORGANIZATION_ID is not set — copy .env.example to .env')
}

export default defineCliConfig({
  app: {
    organizationId,
    entry: './src/App.tsx',
    title: 'Fleet',
    icon: './static/icon.svg',
  },
  deployment: {appId},
})
