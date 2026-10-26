# Production deployment

This repository supports a Vercel static frontend, a Railway or Render Node web service, MongoDB Atlas, and Cloudinary. The checked-in manifests do not contain credentials. Railway and Render deploy the API from `server/`; connect the GitHub repository and configure each provider before production use.

## Readiness and limitations

- The root Vite production build works. `vercel.json` serves the SPA entry point for client-side routes, including nested-route refreshes.
- The frontend API client reads `VITE_API_BASE_URL`; set this to the deployed API origin plus `/api/v1` in Vercel. The local default `/api/v1` is for development proxying and must not be used for a Vercel deployment without an API proxy rewrite.
- The only Vite variables are public API/proxy/upload-size settings. Never add server credentials to Vercel `VITE_*` variables.
- Render's health check uses `/api/v1/health`, which returns HTTP 200 only when MongoDB is connected.
- Citizen reporting, worker task management, and operational-admin assignment workflows are implemented. These still require a reachable production API and accounts with the appropriate roles.
- Exact coordinates currently have no automatic retention policy, and Cloudinary image delivery URLs are publicly retrievable if shared. Set retention and image/privacy policy before accepting real public reports. A restricted academic demo is a safer first deployment.
- Preview deployments use different origins. The API allowlist accepts only the exact `CLIENT_URL`; preview sign-in/API writes will fail unless the preview origin is explicitly configured for a separate non-production backend.

## Vercel frontend

1. Push this repository to a GitHub repository and import it in Vercel. Use the repository root as the project root, Vite as the framework, `npm run build` as the build command, and `dist` as the output directory. `vercel.json` supplies the SPA fallback rewrite for deep links.
2. Add these Production environment variables in Vercel:

   - `VITE_API_BASE_URL=https://<your-api-domain>/api/v1`
   - `VITE_REPORT_MAX_IMAGE_SIZE_BYTES=5242880`

   Replace the host with the actual Railway or Render service URL. These are public build-time settings; no secret belongs in a `VITE_` variable.
3. Redeploy after setting the values. Confirm the homepage and a nested route both load after a hard refresh.

Vercel's SPA rewrite follows its documented `vercel.json` configuration pattern: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Vercel rewrites](https://vercel.com/docs/routing/rewrites).

## Railway API

1. Push the latest code to GitHub. In Railway, create a project and choose **Deploy from GitHub repo**, then select this repository and the production branch.
2. Open the API service **Settings** and set **Root Directory** to `/server`. The backend has its own `package.json` and lockfile in that folder. Leave the build command at its detected default and set the start command to `npm start` if Railway does not detect it automatically.
3. In **Variables**, add `NODE_ENV=production`, `MONGODB_URI`, a unique `JWT_SECRET` of at least 32 characters, and `CLIENT_URL` set to the exact Vercel production origin (for example `https://your-site.vercel.app`, with no path or trailing slash).
4. Because Vercel and Railway use different sites, also set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`. Keep the API's exact-origin CORS/Origin allowlist through `CLIENT_URL`.
5. For report image uploads, add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Keep all backend secrets in Railway Variables; do not use Vercel `VITE_*` variables for them. Railway injects `PORT`, so do not hardcode or set a separate port.
6. In the service's deployment settings, set the healthcheck path to `/api/v1/health`. Generate a public domain under **Networking**, deploy, then check `https://<your-railway-domain>/api/v1/health`. A healthy response returns HTTP 200 with `database: "connected"`.
7. In Vercel, set `VITE_API_BASE_URL=https://<your-railway-domain>/api/v1` for Production and redeploy the frontend. Sign-in uses an HttpOnly cross-site cookie; some browser privacy settings restrict third-party cookies across unrelated provider domains. If sign-in does not persist, use custom domains under the same site or a same-origin API proxy.

Railway supports setting a monorepo service's root directory and healthcheck in service settings: [Deploying a monorepo](https://docs.railway.com/deployments/monorepo), [healthchecks](https://docs.railway.com/deployments/healthchecks), [variables](https://docs.railway.com/variables).

## Render API (alternative)

1. In Render, create a Blueprint from the GitHub repository using `render.yaml`. It defines the API root directory, `npm ci`, `npm start`, and `/api/v1/health` readiness probe.
2. During Blueprint setup, provide `MONGODB_URI` and `CLIENT_URL`. Set `CLIENT_URL` to the exact Vercel production origin, without a path or trailing slash.
3. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` through Render's secret environment settings. The Blueprint marks them as unsynchronized secrets. `JWT_SECRET` is generated by Render; do not replace it with a frontend value.
4. Keep `NODE_ENV=production`, `COOKIE_SECURE=true`, and `COOKIE_SAME_SITE=none`. The API uses credentialed cross-origin requests when Vercel and Render have separate origins. Modern browser privacy settings may block third-party cookies across unrelated domains; use custom domains under one site or a same-origin API proxy if sign-in does not persist.
5. Check Render's health endpoint and logs. The service deliberately does not listen until MongoDB connects and indexes initialize.

Render Blueprints support secret prompts, generated values, and health checks as used here: [Blueprint specification](https://render.com/docs/blueprint-spec), [health checks](https://render.com/docs/health-checks).

## MongoDB Atlas

- Use the existing Atlas cluster and database. Create a dedicated least-privilege database user for the deployed service.
- Allow Render's outbound IPs if using a fixed-egress plan; otherwise follow Atlas/Render network guidance for the selected plans. Avoid leaving a broad `0.0.0.0/0` rule in place after setup.
- Put the URI only in Render's `MONGODB_URI`. Preserve the database name and URL-encode special characters in credentials.
- The app initializes indexes and synchronizes configured pilot-zone labels at startup. This does not delete reports. Review Atlas backups before the first production deploy.

## CI/CD

`.github/workflows/ci.yml` runs server tests, client tests, and the Vite production build for pushes and pull requests to `main` or `master`. Vercel and Render should be connected to the same GitHub repository so their native integrations deploy successful branch commits. This workflow does not contain deployment credentials or deploy by itself.

Before enabling provider auto-deploys, require the CI check to pass on the production branch. Use pull requests for code review and deploy staging/preview environments before production.

## First account and smoke checks

- Citizen registration activates immediately. Worker and administrator signup requests must be approved by an existing administrator. The initial administrator must be seeded once with the documented `INITIAL_ADMIN_*` variables against the production API, then those values must be removed. Do not add default credentials or expose an admin seeding endpoint.
- After deploy, verify `/api/v1/health`, registration/login, session restoration, logout, report submission with a non-sensitive test image, citizen-owned report listing, and a nested-route refresh.
- Remove the test report and Cloudinary object through an authorized operational procedure after smoke checks; there is no public delete endpoint.

## Rollback

Vercel and Render retain prior deployments. If a production deploy fails health or smoke checks, use the provider dashboard to restore the last known-good deployment, then revert the corresponding Git commit and redeploy after CI passes. Avoid rolling back environment variables or Atlas data independently without checking schema compatibility. Phase 4 introduces no database migration or destructive data operation.

## Current workspace status

The GitHub remote is configured for `amansharma11981/Swachh`. Provider accounts are configured separately in their dashboards. Push reviewed changes to the intended branch, then confirm the corresponding Railway, Render, or Vercel deployment completed successfully. Do not paste secrets into chat or commit them.
