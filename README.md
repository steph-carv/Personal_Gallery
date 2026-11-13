# Salon

A museum you curate yourself: a 3D gallery you walk through, hang open-access paintings in,
and style room by room. The full brief is in [`HANDOVER.md`](./HANDOVER.md).

**Status:** Phase 4 (multiple rooms and the 2D view) of the build order in HANDOVER §10.

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

Open http://localhost:3000 (it opens the starter gallery at `/g/demo`).

### Getting around

| Do this                   | Desktop                                  | Phone            |
| ------------------------- | ---------------------------------------- | ---------------- |
| Look around               | Drag, or **Mouse look** for first-person | Drag             |
| Walk                      | WASD / arrow keys (Shift = faster)       | Tap the floor    |
| Walk to a spot            | Click the floor                          | Tap the floor    |
| Next / previous painting  | E / Q, or the tour bar                   | The tour bar     |
| Step closer (detail view) | Click a painting, or Enter on the tour   | Tap a painting   |
| Back to the room          | Esc, Back to the room, or browser Back   | Back to the room |

Walk through a doorway to reach the next room; the plaque above each doorway names it. The
**2D view** button in the top bar switches to a flat, accessible version of the gallery (it's
remembered on that device, and devices that can't run 3D well start in it).

| Link                             | Opens                                  |
| -------------------------------- | -------------------------------------- |
| `/g/demo`                        | The gallery, at the entrance to Room 1 |
| `/g/demo/landscapes-and-the-sea` | A room, by its slug                    |
| `/g/demo/work/p10`               | A painting's detail view               |

In development, the browser console has `salonDebug.view([x, y, z], [lookX, lookY, lookZ])` to
stand somewhere and look at a point, `salonDebug.store` for the shared UI state and
`salonDebug.scene` for the three.js scene.

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
    g/[username]/            the gallery layout (stays mounted) + room and painting pages
  components/
    gallery/                 2D interface: tour bar, detail overlay, zoom viewer, 2D view, URL sync
    three/
      GalleryScene.tsx       the Canvas: renderer, lights, environment, what goes where
      room/                  architecture: walls, doorways + plaques, trims, floor, ceiling, bench
      art/                   a hung painting: canvas, frame, wall label, spotlight
      geometry/              sweepProfile (frames and mouldings) and the profiles
      textures/              floor, plaster, gilt and leather textures drawn in code
      camera/                the camera rig (all movement), viewing poses, floor plan + routing
  lib/
    gallery/                 data types, starter collection, room layout, tour order, shared state
    hooks/                   media-query and reduced-motion hooks
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
- Rooms are laid out in a line running north (`lib/gallery/layout.ts`), joined by doorways in
  the middle of their north and south walls. Each room has an `origin` in the world; room
  components are drawn round their own centre and moved into place.
- Only the current room and its neighbours are built (`GalleryScene.tsx`). The picture
  spotlights are a fixed pool aimed at the current room (`art/PictureLights.tsx`).
- The camera is only ever moved by `camera/CameraRig.tsx`. Its pose is position + yaw + pitch
  (yaw 0 looks north; positive turns left). Everything else asks it to move through the store's
  `camera` commands or by changing `detailId`.

## Deploying to Vercel

1. Go to https://vercel.com/new and import the `Personal_Gallery` GitHub repository.
2. Vercel detects Next.js; leave the build settings as they are.
3. Under **Environment Variables**, add `NEXT_PUBLIC_APP_MODE` = `personal`. (The Supabase
   variables can wait until Phase 5.)
4. Click **Deploy**. Every push to the production branch redeploys; other branches get preview
   URLs.
