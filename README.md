# Salon

A museum you curate yourself: a 3D gallery you walk through, hang open-access paintings in,
and style room by room. The full brief is in [`HANDOVER.md`](./HANDOVER.md).

**Status:** Phase 2 (one hard-coded 3D room) of the build order in HANDOVER §10.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- [three.js](https://threejs.org) via [React Three Fiber](https://r3f.docs.pmnd.rs) and drei
- [Supabase](https://supabase.com) for Postgres, auth and storage (wired up in Phase 5)
- Zod for validation, Zustand for scene/UI state
- ESLint + Prettier

> Next.js 16 differs from older versions you may find online: middleware is now called
> **proxy** (`src/proxy.ts`, added with auth in Phase 5), and **Cache Components** is on, so anything that reads cookies or
> headers must sit inside a `<Suspense>` boundary. The docs that match the installed version are
> in `node_modules/next/dist/docs/`.

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000, click **Walk in**, then walk with WASD / arrow keys and look with the
mouse (Shift walks faster, Esc lets go of the mouse).

In development, the browser console has `salonDebug.camera` for moving the camera by hand, e.g.
`salonDebug.camera.position.set(0, 1.6, 0)`.

## Scripts

| Script                 | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Start the dev server                                  |
| `npm run build`        | Production build                                      |
| `npm run start`        | Serve the production build                            |
| `npm run lint`         | ESLint                                                |
| `npm run typecheck`    | Generate route types, then run `tsc`                  |
| `npm run format`       | Format everything with Prettier                       |
| `npm run format:check` | Check formatting without changing files               |
| `npm run check`        | Lint + typecheck + format check (run before you push) |

## Environment variables

See [`.env.example`](./.env.example). All are validated at start-up in `src/lib/env.ts`.

| Variable                               | Needed from | Notes                                     |
| -------------------------------------- | ----------- | ----------------------------------------- |
| `NEXT_PUBLIC_APP_MODE`                 | now         | `personal` (default) or `public`, see §0b |
| `NEXT_PUBLIC_SUPABASE_URL`             | Phase 5     | Supabase → Project Settings → Data API    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Phase 5     | Supabase → Project Settings → API Keys    |

## Project layout

```
src/
  app/                       routes (App Router): layout, pages, global styles
  components/
    gallery/                 2D interface around the 3D scene (top bar, "Walk in" card)
    three/
      GalleryScene.tsx       the Canvas: renderer, lights, environment, what goes where
      room/                  architecture: walls + trims, floor, ceiling/skylight, bench
      art/                   a hung painting: canvas, frame, wall label, spotlight
      geometry/              sweepProfile (frames and mouldings) and the profiles
      textures/              floor, plaster, gilt and leather textures drawn in code
      controls/              first-person walking and collisions
  lib/
    gallery/                 data types, the hard-coded Room 1, shared UI state (Zustand)
    config.ts                APP_MODE (personal / public)
    env.ts                   validated environment variables
    supabase/                browser and server Supabase clients
public/art/starter/          starter collection images (sources in CREDITS.md)
```

### 3D conventions

- Units are **metres**. The floor is at y = 0 and the room is centred on the origin; x runs
  west → east, z runs north → south.
- Each wall has a local frame (`room/wallTransforms.ts`): x along the wall to the right as you
  face it, y up, z out into the room. Paintings are placed in these wall coordinates, which is
  also how they're stored (`placements.wall`, `x`, `y`).
- Paintings hang at their real size when it's known (`art/paintingSize.ts`).

## Deploying to Vercel

1. Go to https://vercel.com/new and import the `Personal_Gallery` GitHub repository.
2. Vercel detects Next.js; leave the build settings as they are.
3. Under **Environment Variables**, add `NEXT_PUBLIC_APP_MODE` = `personal`. (The Supabase
   variables can wait until Phase 5.)
4. Click **Deploy**. Every push to the production branch redeploys; other branches get preview
   URLs.
