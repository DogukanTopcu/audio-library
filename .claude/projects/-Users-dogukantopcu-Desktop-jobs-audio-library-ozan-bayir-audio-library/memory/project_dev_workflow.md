---
name: Dev workflow and run instructions
description: How to run the project locally, ports, seed users
type: project
---

The project is a Turborepo monorepo. Docker must be running for postgres and redis before starting the API.

**Start infrastructure first:**
docker compose up -d postgres redis

**Run all apps:**
pnpm dev (from root)

**Ports:**
- API (NestJS): http://localhost:3001
- Web (Next.js user app): http://localhost:3000
- Admin (Next.js admin panel): http://localhost:3002

**Run migrations then seed:**
pnpm db:migrate
pnpm db:seed

**Seed credentials:**
- Superadmin (admin panel /login): admin@ozanbayir.com / Admin123!
- App user (web /giris): kullanici@ozanbayir.com / Kullanici123!

**Why:** Docker compose only defines postgres and redis services (not the API for dev). The NestJS API dev script is `nest start --watch`.
The API package.json now has `"dev": "nest start --watch"` so turbo dev picks it up.
