# Architecture

The React/Vite client remains at the repository root. The Express/Mongoose API, tests, and server-only environment configuration live in `server/`.

```text
React routes + AuthProvider
  -> authService / reportService
  -> shared apiClient (HttpOnly cookie; multipart progress via XHR)
  -> Vite proxy /api/v1
  -> Express: Helmet, CORS, origin guard, rate limits, role checks
  -> Zod validators + Multer memory upload + file signature checks
  -> auth/report controllers and services
  -> Mongoose User, Report, ReportCounter, Zone models -> MongoDB
  -> image-storage adapter -> Cloudinary when configured
```

The API starts only after MongoDB connects and required indexes initialize. At startup it synchronizes configured provisional pilot-zone labels. The health endpoint reports readiness without exposing credentials. Shutdown closes the HTTP listener and Mongoose connection.

Authentication and role checks are enforced by the API. The client auth provider restores session state for navigation, but it is never an authorization boundary. Report queries are scoped to the authenticated citizen; an administrator can read all reports. Workers do not have report access in this phase.

## Report creation

A citizen sends one bounded multipart upload and validated report fields. The API checks the image's file signature, verifies the supplied MIME type, uploads it through the storage adapter, then persists the report and its first status-history event. If MongoDB creation fails, the API attempts to delete the newly uploaded asset. Cloudinary credentials remain server-only. When storage is absent, report creation fails explicitly with HTTP 503.

Locations can be manually described with or without a coordinate pair. When present, coordinates are stored as GeoJSON `[longitude, latitude]`. Browser GPS is only requested after a button action and is recorded as unverified. No geospatial index is used without spatial queries. Provisional zones have no asserted boundary/coordinates.

## Session

The server signs a two-hour default JWT with issuer and audience claims, then sets it as an HttpOnly cookie restricted to `/api/v1`. SameSite defaults to `lax`; production requires Secure. Mutating endpoints require an exact configured Origin. Configure same-site frontend/API hosts or use HTTPS and `COOKIE_SAME_SITE=none` for cross-site deployments.

Logout expires the browser cookie. There is no token denylist, so a copied JWT remains usable until expiry. Keep the lifetime short and treat server-side revocation as future work if the deployment threat model requires immediate logout.
