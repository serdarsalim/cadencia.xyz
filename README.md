# Cadencia

Cadencia is a personal productivity tracker built around a GitHub-style heatmap for life and work consistency.

Live app: https://cadencia.xyz
Repository: https://github.com/serdarsalim/cadencia.xyz

## What Cadencia Is
Cadencia helps you:
- Score daily or weekly progress on a visual year-at-a-glance calendar
- Plan weekly goals and review outcomes
- Track Do's and Don'ts for behavior-level accountability
- Manage OKRs (Objectives and Key Results)
- Mark day-off and sick-leave days
- Share progress with accountability partners, mentors, or teammates

## Core Workflow
1. Open the app and choose `Demo` or `Sign up`.
2. In Calendar view, rate each day (or week) by progress level.
3. Set weekly goals and add Do's / Don'ts.
4. Track objective progress through OKRs.
5. Review patterns in the heatmap and adjust each week.

## Signing In and Data
- Guest/demo mode lets you try the full product flow.
- To persist data, sign up/sign in with Google.
- Signed-in users can save and sync their tracking data.

## Running Locally
### Prerequisites
- Node.js 20+
- npm
- PostgreSQL database (or compatible Neon/Postgres setup)

### Setup
```bash
npm install
```

Create a `.env` file with required variables (example):
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

Run Prisma migrations:
```bash
npx prisma migrate deploy
```

Start development server:
```bash
npm run dev
```

Then open `http://localhost:3000`.

## Tech Stack
- Next.js (App Router)
- React + TypeScript
- Prisma + PostgreSQL
- NextAuth (Google sign-in)
- Tailwind CSS

## Notes
- The app includes a logged-out landing page and a demo flow.
- Demo data is for exploration and does not represent persisted user data.

## License
Cadencia is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-only).
See `LICENSE` for the full text.
