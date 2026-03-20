# Ozan Bayir Audio Library

Monorepo for an audio library platform with:

- a user-facing web app
- an admin panel
- a NestJS backend API
- a shared database package managed with Drizzle ORM

The project is organized with Turborepo and PNPM workspaces.

## Tech Stack

- Monorepo: Turborepo + PNPM workspaces
- Web apps: Next.js 16, React 19, Tailwind CSS 4
- API: NestJS 11
- Database: PostgreSQL 16 + `pgvector` + `pg_trgm`
- Cache / sessions / rate limiting support: Redis
- ORM / migrations / seed: Drizzle ORM + Drizzle Kit
- File storage: Google Cloud Storage

## Applications

- `apps/web`: user-facing application, runs on `http://localhost:3000`
- `apps/admin`: admin panel, runs on `http://localhost:3002`
- `apps/api`: backend API, runs on `http://localhost:3001`
- `packages/db`: Drizzle schema, migrations, seed scripts
- `packages/ui`: shared UI package
- `packages/eslint-config`: shared ESLint config
- `packages/typescript-config`: shared TypeScript config

## Prerequisites

Install these before starting:

- Node.js 20+ recommended
- PNPM 9
- Docker Desktop or Docker Engine

The repo declares `node >= 18`, but development has been verified with Node 20/22.

## Quick Start

This is the fastest local setup for development.

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ozan-bayir-audio-library
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Create environment files

Tracked examples are included in the repo.

```bash
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
cp apps/api/.env.example apps/api/.env
```

Important notes:

- The root `.env` is used by the database scripts and by the API.
- `apps/web/.env.local` and `apps/admin/.env.local` are used by the Next.js apps.
- `apps/api/.env` is optional for local overrides; the API also loads the root `.env`.

### 4. Start local infrastructure

Recommended for development:

```bash
docker compose up -d postgres redis
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

The Docker setup also runs [`infra/init.sql`](./infra/init.sql), which enables:

- `vector`
- `pg_trgm`

If you use your own PostgreSQL instance instead of Docker, create those extensions manually.

### 5. Run database migrations

```bash
pnpm db:migrate
```

### 6. Seed demo data

```bash
pnpm db:seed
```

This creates demo accounts for both the admin panel and the user app.

### 7. Start all apps

```bash
pnpm dev
```

This runs the workspace dev servers together through Turborepo.

## Local URLs

After `pnpm dev`, the local services are:

- Web app: `http://localhost:3000`
- API: `http://localhost:3001`
- Swagger UI: `http://localhost:3001/api/docs`
- Swagger JSON: `http://localhost:3001/api/docs-json`
- Admin panel: `http://localhost:3002`

## Demo Accounts

Created by `pnpm db:seed`:

### Admin panel

- URL: `http://localhost:3002/login`
- Email: `admin@ozanbayir.com`
- Password: `Admin123!`

### User app

- URL: `http://localhost:3000/giris`
- Email: `kullanici@ozanbayir.com`
- Password: `Kullanici123!`

## Environment Variables

### Root `.env`

Use `.env.example` as the default template.

Main variables:

- `DATABASE_URL`: PostgreSQL connection string used by the API and Drizzle scripts
- `REDIS_HOST`: Redis hostname
- `REDIS_PORT`: Redis port
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: required by the API auth module
- `THROTTLE_TTL`: request throttling window in seconds
- `THROTTLE_LIMIT`: max requests per window
- `GCP_PROJECT_ID`: required for upload and signed URL features
- `GCP_BUCKET_NAME`: bucket used for uploaded files and audio playback
- `GCP_CREDENTIALS_JSON`: JSON string for a Google service account

### `apps/web/.env.local`

- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

### `apps/admin/.env.local`

- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

### `apps/api/.env`

This file is optional. It is useful if you want app-specific overrides such as:

- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

## Copy-Paste Environment Templates

### Root `.env`

```env
DATABASE_URL=postgresql://ozan:secret@localhost:5432/ozanbayir

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret

JWT_SECRET=change-this-in-real-environments
THROTTLE_TTL=60
THROTTLE_LIMIT=20

# Optional for upload / signed URL features
GCP_PROJECT_ID=
GCP_BUCKET_NAME=ozan-bayir-assets
GCP_CREDENTIALS_JSON=
```

### Web and admin `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Common Commands

### Root commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm check-types
pnpm format
```

### Database commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

### Run apps individually

```bash
pnpm --filter web dev
pnpm --filter admin dev
pnpm --filter api start:dev
```

### Build apps individually

```bash
pnpm --filter web build
pnpm --filter admin build
pnpm --filter api build
```

## Development Workflow

Typical local workflow:

1. Start PostgreSQL and Redis with Docker.
2. Run `pnpm install`.
3. Copy env files from the provided examples.
4. Run `pnpm db:migrate`.
5. Run `pnpm db:seed`.
6. Start all services with `pnpm dev`.
7. Use the seeded credentials to verify login flows.

If you change the database schema:

1. Update files in `packages/db/src/schema`
2. Run `pnpm db:generate`
3. Run `pnpm db:migrate`
4. Reseed if your feature depends on demo data

## Project Structure

```text
.
├── apps
│   ├── admin        # Next.js admin panel
│   ├── api          # NestJS backend
│   └── web          # Next.js user-facing app
├── infra
│   └── init.sql     # PostgreSQL extensions for Docker setup
├── packages
│   ├── db           # Drizzle schema, migrations, seed
│   ├── ui           # Shared UI components
│   ├── eslint-config
│   └── typescript-config
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Backend Notes

- The API uses a global prefix of `/api`.
- Swagger is available at `/api/docs`.
- The API loads env files from both its own folder and the repository root.
- Redis is configured through Nest's `ConfigModule`.
- Upload and signed URL functionality rely on Google Cloud Storage.

## Google Cloud Storage Notes

The app can start without valid GCP credentials, but upload-related features will not work.

What still works without valid GCP credentials:

- local boot
- database migrations
- database seed
- login with seeded accounts
- most non-upload routes

What requires valid GCP configuration:

- document upload
- audio upload
- signed URLs for bucket files

If you see a warning like this in the API logs:

```text
Ignoring invalid GCP_CREDENTIALS_JSON. Upload routes will require valid credentials before use.
```

that means the API booted successfully, but GCP-backed routes are not ready yet.

## Docker Notes

`docker-compose.yml` includes an `api` service, but for day-to-day development the recommended setup is:

- run `postgres` and `redis` with Docker
- run `web`, `admin`, and `api` locally with PNPM

That gives you hot reload for all apps.

If you run the API through Docker, do not also run the local API on port `3001`.

## Troubleshooting

### `NOAUTH Authentication required` from Redis

Make sure `REDIS_PASSWORD` matches between:

- root `.env`
- `apps/api/.env` if you use it
- `docker-compose.yml`

### Port `3001` is already in use

Something else is already running on the API port.

Common causes:

- an old local `nest start --watch` process
- the `api` Docker container

Stop the conflicting process or change the port.

### Login fails even though the apps are running

Usually one of these is missing:

- `pnpm db:migrate`
- `pnpm db:seed`

The seed step creates the demo admin and user credentials.

### Web or admin cannot reach the backend

Check:

- `apps/web/.env.local`
- `apps/admin/.env.local`

Both should point to:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Need a clean local reset

```bash
docker compose down -v
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
```

## Verified Commands

These commands have been verified in this repository:

- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm --filter api build`
- `pnpm --filter web build`
- `pnpm --filter admin build`

## First Things To Check After Setup

Once everything is running, verify these in order:

1. Open `http://localhost:3001/api/docs`
2. Open `http://localhost:3002/login` and log in with the seeded admin
3. Open `http://localhost:3000/giris` and log in with the seeded user
4. Confirm both apps are talking to the local API

