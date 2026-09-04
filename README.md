# Frontdesk — Reception & Visitor Management

A Stage 1 visitor-management MVP built with Next.js App Router, TypeScript, PostgreSQL, and Prisma.

## What it includes

- Reception dashboard with status filter, visitor list, and check-in/out actions.
- Visitor registration modal with client-side required fields and server-side Zod validation.
- Department approval queue, ordered by priority then arrival time.
- A traceable status lifecycle with status-history records and key event timestamps.
- Seeded HR, Marketing, E-commerce, and Accounts departments with sample hosts.

## Local setup

1. Install dependencies: `npm install`
2. Create your environment file: `cp .env.example .env`, then set `DATABASE_URL` to a PostgreSQL connection string.
3. Create the database schema: `npx prisma migrate dev --name init`
4. Seed initial data: `npm run db:seed`
5. Start the app: `npm run dev`

Open `http://localhost:3000`. The receptionist dashboard is the home page; the department queue is at `/department`.

## Lifecycle

New registrations immediately enter `WAITING_APPROVAL`. Department staff can approve or reject. Reception may then check in an approved visitor; check-in can become `IN_MEETING` and then `CHECKED_OUT`. Each change stores a history row and records the appropriate timestamp.

## Vercel deployment

1. Create a managed PostgreSQL database (Vercel Postgres, Neon, Supabase, or equivalent).
2. Add its pooled/production connection as `DATABASE_URL` in Vercel Project Settings.
3. Deploy the repository. The build command runs `prisma generate` before `next build`.
4. Run `npx prisma migrate deploy` against the production database, then `npm run db:seed` once if you want the initial departments and hosts.

For a production rollout, add authentication and derive the selected department from the signed-in user rather than the URL parameter.
