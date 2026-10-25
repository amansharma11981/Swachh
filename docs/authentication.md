# Authentication and authorization

## Flow

1. The browser loads `AuthProvider`, which calls `GET /api/v1/auth/me` with credentials.
2. The API reads the HttpOnly session cookie, verifies the JWT signature, issuer, audience, and expiry, then loads the current user. Inactive or missing users receive 401.
3. Registration validates input, hashes the password, creates role `citizen` regardless of any attempted role assignment, and issues the normal session cookie.
4. Login validates credentials with a generic failure response and sets the same cookie.
5. Protected React layouts wait for session restoration and check the display role. Express middleware independently checks the database-backed user and route policy.
6. Logout expires the cookie. A copied JWT is not revoked and expires within the configured lifetime (two hours by default).

## Password policy

Passwords must be 8–128 characters. bcrypt cost is 12. Password confirmation is checked by the client and, when supplied, by server validation. No password hash is returned.

## Cookie and CSRF policy

Cookies are HttpOnly, have `Path=/api/v1`, and use SameSite=Lax by default. Production requires `COOKIE_SECURE=true`; SameSite=None also requires Secure. CORS only allows configured `CLIENT_URL` origins with credentials. Unsafe HTTP methods require an exact allowed Origin. Deploy the browser and API same-site where practical.

There is no persistent refresh session, token revocation list, email verification, or password reset in this phase.

## Role matrix

| Operation | Citizen | Worker | Admin |
| --- | --- | --- | --- |
| Own profile GET/PATCH | Yes | Yes | Yes |
| List all users | No | No | Yes |
| Change a user's role | No | No | Yes |
| Access citizen route area | Yes | No | No |
| Access worker route area | No | Yes | No |
| Access admin route area | No | No | Yes |

Public registration has no role field. Unknown input properties are rejected. Only the explicit admin seed command creates the initial administrator. Worker accounts can only be promoted by an authenticated admin through the role-management API.
