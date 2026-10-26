# Citizen reports (Phase 3)

## Data and ownership

`Report` stores a collision-safe sequential report number, the authenticated reporter reference, category, description, location, optional configured-zone snapshot, image references, current status, priority, assignment metadata, server-generated status and assignment history, and timestamps. A reporter ID, status, priority, assignment, or history supplied by a citizen is rejected. The reporter is taken from the verified HttpOnly session.

Citizens can access only their own reports. Requests for another citizen's valid report return 404 so the API does not disclose its existence. Administrators can read report details and use the paginated all-report endpoint. Workers can access task details only for reports assigned to their authenticated worker account. A citizen may update description/category/zone only while status is `submitted`.

## Status policy

Every newly created report starts as `submitted`, priority `normal`, with a server-created initial history event. The transition service validates this directed flow:

| Current | Allowed next status |
| --- | --- |
| submitted | under_review, rejected, duplicate |
| under_review | assigned, rejected, duplicate |
| assigned | in_progress, under_review |
| in_progress | submitted_for_verification, resolved, under_review |
| submitted_for_verification | resolved, in_progress, reopened |
| resolved | reopened |
| rejected | reopened |
| duplicate | none |
| reopened | under_review, assigned |

Worker changes use the task service; administrator moderation uses the existing transition service. Both append actor/timestamp history. The citizen timeline includes the verification status. Phase 8 adds report moderation, audit history, map views, and real metrics while preserving the Phase 5 worker completion flow.

## Images

The API accepts one authenticated multipart field named `image`, only JPEG, PNG, or WebP, default maximum 5 MiB. Multer keeps the bounded upload in memory; the server checks the file signature with `file-type` and requires it to match the declared MIME type. Cloudinary stores citizen photos and worker completion evidence with a size/quality transformation and returns a secure URL/reference. If the MongoDB report write fails after storage succeeds, the API attempts to delete the orphaned Cloudinary asset.

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in backend-only `server/.env`. Until all three exist, report creation responds with 503; tests inject a mock storage adapter. The current Cloudinary integration uses standard delivery URLs, which are publicly retrievable if shared. Do not upload faces or sensitive/private material. Review provider privacy and retention requirements before public deployment. The API never logs file contents or storage credentials.

`REPORT_MAX_IMAGE_SIZE_BYTES` configures the server limit from 1 KiB through 20 MiB (default 5 MiB). The browser limit can optionally be set with `VITE_REPORT_MAX_IMAGE_SIZE_BYTES`; keep it equal to or below the server limit.

## Location and zones

Browser geolocation is requested only after the citizen selects **Use my current location**. The Leaflet map also lets the citizen click a location; map-selected or manually entered coordinates are stored as GeoJSON `[longitude, latitude]` and validated against longitude/latitude ranges. The map’s default center is a configurable initial viewport only and is never assigned to a report. Exact coordinates remain on the report record; no automatic retention/cleanup policy is implemented yet, so deployment owners must define a retention period before collecting real public submissions.

`REPORT_ZONES` is a semicolon-separated list of `zone-id=Display name`. Configured active zones are synchronized at API startup. Zone names are snapshots on reports; the initial NIT More, Ashok Rajpath, and NIT/Gandhi Ghat names are provisional and have no verified boundaries or coordinates. The UI labels them accordingly. A 2dsphere index is used for actual stored report locations; it does not create or imply campus boundaries.

## API and UI

- `POST /api/v1/reports`: authenticated citizen multipart submission.
- `GET /api/v1/reports/dashboard`: the citizen's real totals and five most recent reports.
- `GET /api/v1/reports/my?page=1&limit=10&status=submitted`: own reports; page size max 50.
- `GET /api/v1/reports/:id`: own report, or any report for an administrator.
- `PATCH /api/v1/reports/:id`: owner-only description/category/zone update before review.
- `GET /api/v1/reports/meta/zones`: active configured zones and whether image storage is enabled.
- `GET /api/v1/reports?page=1&limit=10&status=...`: administrator-only report listing.
- `GET /api/v1/reports/map`: role-scoped geolocated reports; citizens see only their own reports, workers only assigned reports, and administrators all located reports. Markers never include reporter contact details or internal notes.
- `GET /api/v1/reports/admin/metrics`: real counts, category/zone aggregations, and average resolution duration for administrators.
- `PATCH /api/v1/reports/admin/:id/moderate`: administrator correction of category, priority, status, optional AI review decision, and private note; status transitions are validated and actions are audited.
- `GET /api/v1/reports/admin/:id/duplicate-candidates` and `POST /api/v1/reports/admin/:id/duplicates`: heuristic duplicate candidates and administrator-reviewed links. Candidates are never auto-closed.
- `GET /api/v1/reports/admin/audit` and `GET /api/v1/reports/admin/:id/audit`: append-only administrative event listings.

Run `npm run test:server` for isolated API tests and `npm run test:client` for React tests. The tests use mocked Mongoose models and mocked image storage; they do not upload to Cloudinary or write to the configured Atlas database.

## Phase 6–8 notes and limits

AI image classification is optional. After a citizen chooses **Analyze image with AI**, the API sends that image and up to 500 characters of its description to Groq using backend-only `GROQ_API_KEY`; `GROQ_VISION_MODEL` defaults to `qwen/qwen3.8-27b`. Analysis output is validated and bound to the exact image/description with a short-lived server signature before it can be saved on the report. Provider failures do not block manual report submission. Model confidence is not treated as calibrated or shown as a score. Cloudinary delivery is not private/signed in this phase. Report images and precise coordinates should be treated as sensitive user content.

The map uses OpenStreetMap tiles with visible attribution and a configurable tile URL. Configure `VITE_MAP_CENTER_LAT`, `VITE_MAP_CENTER_LNG`, and optionally `VITE_MAP_TILE_URL` in the frontend environment. The map center is not a complaint location. Use the standard tile server in accordance with its [usage policy](https://operations.osmfoundation.org/policies/tiles/); do not bulk-download or prefetch tiles.
