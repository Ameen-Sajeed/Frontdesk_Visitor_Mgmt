# arriVo

A visitor-management workspace for reception teams and department leads. Reception registers visitors and manages check-in/out; department leads approve or reject visitors for their department.

## Stack

Next.js App Router, TypeScript, PostgreSQL, Prisma, and Socket.IO.

## Features

- Role-based reception and department workspaces
- Visitor registration, approval, check-in, meeting, and checkout workflow
- Search, filters, pagination, export to Excel/PDF, and visit history
- Real-time visitor updates and host presence
- Profile editing, password changes, manual status, and session timing

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` with a PostgreSQL connection and a strong JWT secret:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/reception?schema=public"
   JWT_SECRET="replace-with-a-long-random-production-secret"
   ```

3. Start PostgreSQL, apply every migration, and seed sample data:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

4. Start the application:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Sample accounts

The seed uses password `password123` for local development only:

- Reception: `reception@company.test`
- Department lead: `aisha@company.test` (and the other seeded department emails)

## Useful commands

```bash
npm run build       # production build and type validation
npm run db:generate # regenerate Prisma Client
npx prisma migrate deploy
npm run db:seed
```

## Architecture notes

- Authentication is a signed, HTTP-only cookie; access is enforced in middleware and route handlers.
- Visit transitions and status history are centralized in `src/lib/visits.ts`.
- The custom Node server owns Socket.IO and broadcasts visitor/presence events.
- User availability and session data require the latest Prisma migrations before the app starts.

## Deployment

Use a managed PostgreSQL database, configure `DATABASE_URL` and `JWT_SECRET`, run `npx prisma migrate deploy` during release, then start the custom Node server with `npm start`.
