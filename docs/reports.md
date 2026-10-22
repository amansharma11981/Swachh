# Citizen reports (Phase 3)

## Data and ownership

`Report` stores a collision-safe sequential report number, the authenticated reporter reference, category, description, location, optional configured-zone snapshot, image references, current status, normal priority, server-generated status history, and timestamps. A reporter ID, status, priority, assignment, or history supplied by a client is rejected. The reporter is taken from the verified HttpOnly session.

Citizens can access only their own reports. Requests for another citizen's valid report return 404 so the API does not disclose its existence. Administrators can read report details and use the paginated all-report endpoint. Worker report access and report management are not enabled in this phase. A citizen may update description/category/zone only while status is `submitted`.

## Status policy

Every newly created report starts as `submitted`, priority `normal`, with a server-created initial history event. The transition service validates this directed flow:

| Current | Allowed next status |
| --- | --- |
| submitted | under_review, rejected, duplicate |
| under_review | assigned, rejected, duplicate |
| assigned | in_progress, under_review |
| in_progress | resolved, under_review |
| resolved | reopened |
| rejected | reopened |
| duplicate | none |
| reopened | under_review, assigned |

There is no status-transition HTTP endpoint or admin review UI yet. The transition service is ready for the future review workflow. No unrecorded status event is shown in the citizen timeline.

## Images

The API accepts one authenticated multipart field named `image`, only JPEG, PNG, or WebP, default maximum 5 MiB. Multer keeps the bounded upload in memory; the server checks the file signature with `file-type` and requires it to match the declared MIME type. Cloudinary stores originals with a size/quality transformation and returns a secure URL/reference. If the MongoDB report write fails after storage succeeds, the API attempts to delete the orphaned Cloudinary asset.

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in backend-only `server/.env`. Until all three exist, report creation responds with 503; tests inject a mock storage adapter. The current Cloudinary integration uses standard delivery URLs, which are publicly retrievable if shared. Do not upload faces or sensitive/private material. Review provider privacy and retention requirements before public deployment. The API never logs file contents or storage credentials.

`REPORT_MAX_IMAGE_SIZE_BYTES` configures the server limit from 1 KiB through 20 MiB (default 5 MiB). The browser limit can optionally be set with `VITE_REPORT_MAX_IMAGE_SIZE_BYTES`; keep it equal to or below the server limit.

## Location and zones

Browser geolocation is requested only after the citizen selects **Use my current location**. Coordinates are stored as GeoJSON `[longitude, latitude]`, validated against longitude/latitude ranges, and labeled as unverified browser location. Manual entry requires a place/landmark; coordinates are optional but must be supplied as a valid pair. There is no map or geocoder dependency, so no location is fabricated. Exact coordinates remain with the report record; no automatic retention/cleanup policy is implemented yet, so deployment owners must define a retention period before collecting real public submissions.

`REPORT_ZONES` is a semicolon-separated list of `zone-id=Display name`. Configured active zones are synchronized at API startup. Zone names are snapshots on reports; the initial NIT More, Ashok Rajpath, and NIT/Gandhi Ghat names are provisional and have no verified boundaries or coordinates. The UI labels them accordingly. No geospatial index is created because no spatial query is implemented.

## API and UI

- `POST /api/v1/reports`: authenticated citizen multipart submission.
- `GET /api/v1/reports/dashboard`: the citizen's real totals and five most recent reports.
- `GET /api/v1/reports/my?page=1&limit=10&status=submitted`: own reports; page size max 50.
- `GET /api/v1/reports/:id`: own report, or any report for an administrator.
- `PATCH /api/v1/reports/:id`: owner-only description/category/zone update before review.
- `GET /api/v1/reports/meta/zones`: active configured zones and whether image storage is enabled.
- `GET /api/v1/reports?page=1&limit=10&status=...`: administrator-only report listing.

Run `npm run test:server` for isolated API tests and `npm run test:client` for React tests. The tests use mocked Mongoose models and mocked image storage; they do not upload to Cloudinary or write to the configured Atlas database.

## Current limits

AI classification, priority assessment, admin review/status endpoints, worker assignment, worker completion, notifications, maps, and GPS reverse geocoding are not implemented. Cloudinary delivery is not private/signed in this phase. Report images and precise coordinates should be treated as sensitive user content even though the app does not publish them in a public listing.
