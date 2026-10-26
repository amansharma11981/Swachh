# Phases 12–14: security, accessibility, and release audit

**Review date:** 27 October 2026
**Scope:** repository source and automated tests in this workspace. This is a code review and test report, not a penetration test or confirmation of live provider configuration.

## Current verification status

| Check | Result |
| --- | --- |
| Vite production build | Passed (`npm run build`) |
| Backend automated tests | Passed: 42/42 (`npm run test:server`) |
| Frontend automated tests | Passed: 20/20 (`npm run test:client`) |
| Live Railway health | Passed: `GET /api/v1/health` returned HTTP 200 with `status: ok` and `database: connected` on 27 October 2026 |
| Live Vercel page | Passed: configured Vercel URL returned HTTP 200 |
| Frontend/API wiring | Public Vercel bundle contains the Railway API hostname; Railway CORS preflight explicitly allowed the Vercel origin |
| Authenticated Vercel-to-Railway workflows / Cloudinary / Groq | Not verified; requires interactive credentials and a controlled test account/image |
| Browser/screen-reader manual review | Not performed; automated component tests and source inspection only |

Never describe a local build as a successful cloud deployment.

## Security controls reviewed

- Authentication is held in a short-lived, HttpOnly cookie; backend role checks are repeated for protected operations. Session restoration in the frontend is only navigation state.
- Mutating requests are protected by allowed-origin validation; cookie SameSite/Secure options must match the chosen deployment topology.
- Request bodies use Zod validation, uploads are bounded and checked by file signature, rate-limited endpoints cover account, report, AI, and recommendation operations, and Helmet/CORS are configured at the API boundary.
- Report queries use authenticated ownership or assigned-worker scopes. Citizens cannot obtain other citizens’ reports through their own-history, status lookup, or map routes.
- Secrets are backend-only. AI requests happen only on explicit user actions. Complaint draft creation does not persist reports; report details used for deterministic status responses are not sent to Groq.
- Recommendation generation sends only aggregate evidence to Groq. Server validation binds recommendations to supplied evidence keys and rejects unsupported numeric text. An administrator must review and record decisions; recommendations do not change official report priority or status.
- Generic normalized production errors avoid exposing internal stack traces. Logs must continue to avoid credentials, cookies, and user-submitted content.

## Residual security and operational risks

- Cloudinary delivery URLs are usable public media URLs in the current storage model. Avoid uploading faces, identity documents, or other sensitive content. Review provider transformations, retention, and access settings before broader use.
- Logout clears a browser cookie but does not revoke an already copied JWT. Email verification, password recovery, MFA, and server-side token revocation are not implemented.
- Administrative recommendation AI is advisory and may be unavailable, biased, or wrong. The review queue, evidence labels, limitations, and human decision are part of the feature; do not treat AI priority as a report’s official priority.
- Zone labels are provisional. Geographic grids are approximate and only exposed when enough unresolved located records exist. They do not represent inspected waste prevalence.
- Cloud hosting, Atlas network access, provider quotas, secret values, backups, restoration, monitoring, and DNS must be checked in the owner’s provider consoles. This workspace cannot certify them.

## Accessibility and responsive work included

- Added a keyboard skip link and a compact mobile route navigation for the app layout where the desktop sidebar is hidden.
- Added a text-list alternative for the map’s currently returned geolocated report markers.
- Complaint draft and recommendation error/loading output use status or alert semantics; users can clear the assistant conversation.
- Preserve the existing focus-visible styles and verify keyboard order, contrast, text zoom, reduced-motion behavior, form labels, and mobile widths manually before a public accessibility claim.

## Remaining release actions

1. Confirm Vercel’s frontend API base URL points to the live Railway URL and that the backend allowlists the exact frontend origin.
2. Confirm Railway has production-only MongoDB, JWT, Cloudinary, and Groq secrets; never paste secret values into logs or project documentation.
3. Confirm Atlas network access, database user permissions, backup/restore procedure, and retention policy.
4. Run the hosted health endpoint and one real citizen signup/login/report workflow, admin review workflow, and worker task workflow using test accounts and a non-sensitive test image.
5. Check provider logs for secret-free startup and request errors; keep a rollback commit or redeployment path available.
6. Record the actual date, URLs, browser/device, test account roles, observed results, and any failed checks in the final submission. Do not put passwords or tokens in the report.

## Final release record

Complete only after checking the actual output:

- Build: passed locally (`npm run build`)
- Server tests: 42 passed, 0 failed (`npm run test:server`); local HTTP tests required loopback permission
- Client tests: 20 passed, 0 failed (`npm run test:client`)
- Live health: `https://swachhai-api-production.up.railway.app/api/v1/health` returned HTTP 200, database connected (checked 27 October 2026)
- Frontend: `https://swachh-liart.vercel.app/` returned HTTP 200 (checked 27 October 2026)
- The public frontend JavaScript references the Railway API hostname; Railway returned HTTP 204 to an OPTIONS request from the Vercel origin with that exact `Access-Control-Allow-Origin`
- Cloud deployment revision: `[record commit if verified]`
- Known blockers: authenticated browser workflows, Cloudinary upload, and Groq live requests were not exercised; deployment revision was not compared with local Git
