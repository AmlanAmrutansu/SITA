# SITA Health

SITA is a responsive women's health companion for cycle tracking, mood insights, reproductive health modes, and supportive daily check-ins.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/sita-health/` — the deployable React + Vite frontend.
- `artifacts/sita-health/src/pages/sita-pages.tsx` — the requested SITA screens and their local interactions.
- `artifacts/sita-health/src/components/AppShell.tsx` — responsive navigation and shared application shell.
- `artifacts/sita-health/src/data/mock.ts` — realistic local demo data.
- `artifacts/sita-health/src/data/store.tsx` — local state model for mode, mood, cycle, chat, and privacy settings.
- `artifacts/sita-health/src/index.css` — SITA's visual tokens, typography, palette, and responsive utilities.

## Architecture decisions

- Supabase is connected through the server-side Replit connector proxy. Auth access and refresh tokens stay in HTTP-only cookies; the browser never receives connector credentials.
- Supabase schema and RLS policies are version-controlled in `artifacts/sita-health/supabase/migrations/001_sita_core.sql`; apply this migration to the connected project before creating production accounts.
- Gemini chat is server-only and uses `GEMINI_API_KEY` from workspace secrets. The frontend calls the API route and never handles the key.
- Wouter routes each major SITA screen so the primary navigation remains deep-linkable and easy to replace with server-backed flows later.
- Shared app state lives in a small provider rather than inside individual screens so local interactions can be upgraded to API mutations without redesigning the UI.
- The responsive shell switches between a desktop rail and mobile bottom navigation while keeping the same five primary destinations.

## Product

SITA provides a warm daily health dashboard, cycle calendar and period logging, mood logging and insights, reproductive health mode selection, pregnancy and postpartum views, a mock SITA chat assistant, and profile/privacy controls.

## User preferences

The uploaded reference image is the visual source of truth: calm pink, lavender, warm white, rounded cards, soft shadows, botanical details, and a premium mobile-app feel.

## Gotchas

- Local demo values remain as a graceful pre-auth fallback, while authenticated profiles, moods, cycles, and chat hydrate from Supabase.
- The API server now owns auth, profile/data proxying, and Gemini chat; the frontend remains the source of the current product experience.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
