# MagicReview AI

MagicReview AI is organized as a React frontend and an Express API. This repository currently contains the Step 1 project foundation only.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MySQL (needed by future database-backed features; the health endpoint does not require a live database)

## Setup

1. Copy `backend/.env.example` to `backend/.env` and provide local values.
2. Copy `frontend/.env.example` to `frontend/.env` and set the API URL (the default local API is `http://localhost:3000`).
3. Install dependencies in each application with `npm install`.

## Development

Run the API:

```sh
cd backend
npm run dev
```

Run the frontend in another terminal:

```sh
cd frontend
npm run dev
```

The API health endpoint is available at `GET /api/v1/health`.

Backend identity, authorization, tenancy, migration, and seed documentation is available in [`docs/backend-identity-tenancy.md`](docs/backend-identity-tenancy.md).

## Production builds

```sh
cd backend
npm run build
npm start
```

```sh
cd frontend
npm run build
npm run preview
```
