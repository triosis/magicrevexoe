# Backend identity and tenancy foundation

## Database schema

The identity schema uses unsigned `BIGINT` primary keys consistently. The executable migration is in `database/migrations/001_identity_and_tenancy.sql` and creates:

- `users`: global identities and bcrypt password hashes
- `accounts`: four-tier account records and their parent account
- `resellers`, `sub_resellers`, `clients`: hierarchy-specific tenant records
- `roles`, `permissions`, `role_permissions`: normalized permission model
- `account_users`: user membership, role, and resolved tenant keys
- `refresh_tokens`: hashed refresh tokens, expiry, and revocation state
- `audit_logs`: append-only application audit events
- `schema_migrations`: applied migration ledger

Tenant-owned records carry indexed `reseller_id`, `sub_reseller_id`, and `client_id` columns where applicable. Foreign keys enforce valid account relationships.

## Account hierarchy

```text
SUPER_ADMIN
├── RESELLER
│   ├── SUB_RESELLER
│   │   └── CLIENT
│   └── CLIENT
└── CLIENT
```

The authenticated `account_users` membership supplies the current tenant IDs. Request body tenant IDs are not used for authorization. Public registration always creates a new standalone `CLIENT` account and assigns `CLIENT_OWNER`; its strict Zod schema rejects role and tenant fields.

Database repository queries apply the authenticated tenant scope:

- `SUPER_ADMIN`: platform scope
- `RESELLER`: rows matching its `reseller_id`, including clients under its sub-resellers
- `SUB_RESELLER`: rows matching its `sub_reseller_id`
- `CLIENT`: rows matching its `client_id`

Cross-tenant lookups return `404` to avoid disclosing resource existence.

## Authentication and JWT flow

1. Registration or login validates input and verifies the bcrypt password hash.
2. The server returns a short-lived access JWT in the JSON response.
3. A longer-lived refresh JWT is set in the `magicreview_refresh` HttpOnly, SameSite=Strict cookie.
4. Only the refresh token's SHA-256 hash and JWT ID are stored in MySQL.
5. Refresh rotates the token: the previous record is revoked before a new token is issued.
6. Logout revokes the refresh record and clears the cookie.
7. Access authentication reloads the active user, account, role, and permissions from MySQL, so suspensions and permission changes take effect without waiting for token expiry.

JWT secrets stay in environment variables and must contain at least 32 characters. They are never persisted or logged.

## Roles and permissions

Seeded roles are:

- `SUPER_ADMIN`
- `RESELLER_OWNER`, `RESELLER_STAFF`
- `SUB_RESELLER_OWNER`, `SUB_RESELLER_STAFF`
- `CLIENT_OWNER`, `CLIENT_MANAGER`, `CLIENT_STAFF`

Permissions are seeded from `database/seeds/001_roles_permissions.sql`. Routes use `authorize('permission.code')`; application controllers do not contain scattered role checks. `requireAccount(...)` is reserved for hierarchy constraints that cannot be represented by a permission alone, such as preventing a sub-reseller from creating another sub-reseller.

## API protection

Protected routes compose these middleware functions:

```ts
authenticate,
authorize('client.view'),
tenantScope,
controller
```

- `authenticate`: validates the Bearer access token and reloads current membership
- `authorize`: checks normalized permissions and audits denials
- `tenantScope`: derives scope exclusively from the authenticated membership
- `requireAccount`: enforces permitted hierarchy tiers
- `errorHandler`: emits centralized, sanitized errors

Authentication routes are rate limited. Helmet, credential-aware CORS, Zod validation, parameterized SQL, HttpOnly cookies, and generic credential errors are enabled.

## Audit logging

Audit rows are inserted through `recordAuditEvent`. No update or delete method is exposed. Recorded context includes actor IDs, tenant IDs, event/entity data, before/after JSON, SHA-256 IP hash, user agent, and timestamp. Login success/failure, logout, user creation, and permission denial are implemented; the remaining enumerated event types are available for later update workflows.

`GET /api/v1/audit-logs` requires `audit.view` and applies tenant scope in SQL.

## Configuration and seed

Copy `backend/.env.example` to `backend/.env`. Required database and security settings include:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_NAME=magicreview
DB_USER=
DB_PASSWORD=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
```

The super-admin password must be at least 12 characters. Credentials are read only by the seed command and are never hardcoded.

```sh
npm run db:migrate
npm run db:seed
```

`npm run db:reset` is **destructive**. It drops all MagicReview identity/tenancy tables, then reapplies migrations and seeds. Do not run it against a database containing data that must be retained.

## API routes

| Method | Route | Protection |
| --- | --- | --- |
| GET | `/api/v1/health` | Public |
| POST | `/api/v1/auth/register` | Public, rate limited |
| POST | `/api/v1/auth/login` | Public, rate limited |
| POST | `/api/v1/auth/refresh` | Refresh cookie, rate limited |
| POST | `/api/v1/auth/logout` | Authenticated |
| GET | `/api/v1/auth/me` | Authenticated |
| GET | `/api/v1/clients` | `client.view`, tenant scoped |
| GET | `/api/v1/clients/:id` | `client.view`, tenant scoped |
| GET | `/api/v1/audit-logs` | `audit.view`, tenant scoped |

