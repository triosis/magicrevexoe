# Hostinger: two deployments from one repository

The repository root contains the React frontend. `backend/` contains the separate Express API.

| Setting | Frontend | Backend |
| --- | --- | --- |
| Domain | revexoe.com | api.revexoe.com |
| Repository | triosis/magicrevexoe | triosis/magicrevexoe |
| Branch | main | main |
| Root directory | . (repository root) | backend |
| Application type | Express / Node.js | Express / Node.js |
| Node version | 24.x | 24.x |
| Package manager | npm | npm |
| Entry file | server.mjs | dist/server.js |

Both package files have a `prepare` script, so `npm install` builds the application automatically. No separate build command is needed. Keep npm lifecycle scripts enabled. The committed `.npmrc` files include development dependencies needed by TypeScript and Vite.

The frontend and backend are independent npm packages, each with its own lockfile. There is no npm workspace: installing from `backend/` must run only the backend prepare script, never the root Vite build. For local setup, run `npm ci` at the root and `npm ci --prefix backend` for the API.

## Frontend environment

Set `NODE_ENV=production` and `HOST=0.0.0.0`. Keep the hosting-provided PORT. Do not add database credentials or JWT secrets to the frontend deployment.

The landing page currently uses sample data and does not call the backend. `VITE_API_URL` does not connect any features until API calls are implemented.

## Backend environment

Set these in the backend deployment only:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
CORS_ORIGINS=https://revexoe.com,https://www.revexoe.com
DB_HOST=REPLACE_WITH_DATABASE_HOST
DB_PORT=3306
DB_NAME=REPLACE_WITH_DATABASE_NAME
DB_USER=REPLACE_WITH_DATABASE_USER
DB_PASSWORD=REPLACE_WITH_DATABASE_PASSWORD
DB_CONNECTION_LIMIT=5
```

Replace database placeholders with real credentials. Keep the hosting-provided PORT. The variable is `CORS_ORIGINS` (plural). Current backend routes are `/health/live` and `/health/ready`; `/api/v1`, login and review management are not implemented.

## Domain assignment

The current web app on revexoe.com can be reused for the frontend: change its repository root from `backend` to the repository root and its entry from `dist/server.js` to `server.mjs`, then redeploy the new commit.

Create a separate Node.js web app for the backend using the backend settings above. If api.revexoe.com is already configured as a folder subdomain, it must be released before assigning it to the separate Node app. Back up any files in that subdomain before removing its folder-based mapping; do not delete the main website or database. A temporary domain can be used while preparing the backend.

## Verify after deployment

- https://revexoe.com/ displays the landing page.
- https://api.revexoe.com/health/live returns `{"status":"alive"}`.
- https://api.revexoe.com/health/ready returns 200 only when the database connection works.
- The backend root `/` returning 404 is expected; it does not serve the landing page.
