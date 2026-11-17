# Salon

A museum you curate yourself: a 3D gallery you walk through, hang open-access paintings in,
and style room by room. The full brief is in [`HANDOVER.md`](./HANDOVER.md).

**Status:** Phase 6 (catalogue search and hanging works) of the build order in HANDOVER §10.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- [three.js](https://threejs.org) via [React Three Fiber](https://r3f.docs.pmnd.rs) and drei
- [Supabase](https://supabase.com) for Postgres, sign-in (magic link + Google) and row-level security
- Zod for validation, Zustand for scene/UI state
- ESLint + Prettier

> Next.js 16 differs from older versions you may find online: middleware is now called
> **proxy** (`src/proxy.ts`, which keeps the sign-in session fresh), and **Cache Components** is on,
> so anything that reads cookies or headers must sit inside a `<Suspense>` boundary. The docs that match the installed version are
> in `node_modules/next/dist/docs/`.

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The demo gallery at `/g/demo` works without a database; signing in
and your own gallery need a Supabase project (see [Setting up Supabase](#setting-up-supabase)).

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

| Script                    | What it does                                                      |
| ------------------------- | ----------------------------------------------------------------- |
| `npm run dev`             | Start the dev server                                              |
| `npm run build`           | Production build                                                  |
| `npm run start`           | Serve the production build                                        |
| `npm run lint`            | ESLint                                                            |
| `npm run typecheck`       | Generate route types, then run `tsc`                              |
| `npm run format`          | Format everything with Prettier                                   |
| `npm run format:check`    | Check formatting without changing files                           |
| `npm run check`           | Lint + typecheck + format check (run before you push)             |
| `npm run db:starter-seed` | Regenerate the starter collection SQL from `starterCollection.ts` |
| `npm run db:test`         | Test the database rules on a local Postgres (see below)           |

## Environment variables

See [`.env.example`](./.env.example). All are validated at start-up in `src/lib/env.ts`.

| Variable                               | Needed from       | Notes                                                                               |
| -------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_MODE`                 | now               | `personal` (default) or `public`, see §0b                                           |
| `NEXT_PUBLIC_SUPABASE_URL`             | sign-in           | `https://<project id>.supabase.co` (see below)                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sign-in           | Supabase → Project Settings → API Keys                                              |
| `SUPABASE_SECRET_KEY`                  | hanging new works | Supabase → Project Settings → API Keys → Secret keys. **Keep secret.**              |
| `SALON_CONTACT_EMAIL`                  | museum search     | Sent to Wikimedia and the Art Institute so they can get in touch about our requests |

The two `NEXT_PUBLIC_` Supabase values are safe in the browser: what anyone can read or change is
decided by row-level security in the database, not by keeping the key secret. The other two are
server-only. The secret key skips row-level security, so it's used for one thing only: adding a
work to the shared catalogue after the server has checked it at the museum. Never put it in a
`NEXT_PUBLIC_` variable, and mark it **Sensitive** in Vercel.

## Project layout

```
src/
  proxy.ts                   keeps the Supabase session fresh on each request
  app/                       routes (App Router): layout, pages, global styles
    g/[username]/            the gallery layout (stays mounted) + room and painting pages
    login/, welcome/, auth/  sign in, first-time welcome, sign-in callback and actions
    add/                     Add a work: search, saved, storeroom, hang (owners only)
    api/catalogue/search/    GET search across the museum sources
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
    auth.ts                  getViewer(): who's signed in
    catalogue/               museum search: Met, Art Institute of Chicago, Wikidata + Commons
    data/collections.ts      load a gallery from the database (or the built-in demo)
    data/hanging.ts          add a work to the catalogue and find it a place on the wall
    gallery/                 data types, Zod schemas, starter collection, layout, tour, shared state
    hooks/                   media-query and reduced-motion hooks
    config.ts                APP_MODE (personal / public)
    env.ts                   validated environment variables
    supabase/                browser and server Supabase clients
public/art/starter/          starter collection images (sources in CREDITS.md)
supabase/migrations/         the database: schema, row-level security, triggers, starter seed
supabase/tests/              database rule tests (npm run db:test)
scripts/                     starter seed generator, database test runner
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

## Adding works

Owners get an **Add a work** button in their gallery. It opens `/add`:

- **Find a work** searches the Met, the Art Institute of Chicago and Wikidata (with images from
  Wikimedia Commons) at once. Only public-domain or openly licensed works with an image appear:
  the Met's and AIC's public-domain flags, and for Wikidata an artist who died more than 70 years
  ago plus an open licence on the image file. Results are cached for a day.
- **Saved** lists works you've saved from other galleries (saving arrives in Phase 11).
- **Storeroom** holds works that aren't on a wall: from deleted rooms, or rooms that were full.

Pick a work, choose **Hang in [room]**, and press **Hang**. The server looks the work up again at
the museum before saving anything, then puts it in the middle of the widest free stretch of wall
(`lib/gallery/hanging.ts`). Curate mode (Phase 8) adds moving works around.

Museum images are served through Next's image optimiser (`/_next/image`), which fetches each image
once and caches it, so visitors never load images straight from the museums.

## The database

Everything lives in two migrations in `supabase/migrations/`:

- **`…_initial_schema.sql`**: the tables from HANDOVER §4, with row-level security (RLS) on every
  one. RLS is where the rules really live: a private gallery returns no rows to anyone but its
  owner, and you can only change your own rooms and placements. Triggers enforce the 10-room
  limit, keep at least one room, send a deleted room's works to the storeroom, and mark a
  collection as customised on its owner's first change. Signing up runs `handle_new_user()`:
  in personal mode it checks the allowlist, then creates a private profile with copies of the
  three starter rooms.
- **`…_starter_collection.sql`**: generated from `starterCollection.ts` (`npm run db:starter-seed`),
  so the demo and new accounts share one source.

`npm run db:test` runs 40 checks of those rules on a local Postgres 15+ (it needs `psql`, and
`PGHOST`/`PGPORT`/`PGUSER` pointing at a server where it can create a `salon_test` database).

## Setting up Supabase

1. Create a project at https://supabase.com/dashboard (the free plan is fine). Choose a region in
   the UK or EU, and save the database password somewhere safe.
2. In **SQL Editor**, open a new query, paste the whole of
   `supabase/migrations/20261113120000_initial_schema.sql` and click **Run**. Then do the same
   with `supabase/migrations/20261113120100_starter_collection.sql`.
3. Invite yourself: in **Table Editor → signup_allowlist**, insert a row with your email address
   in lower case. Add a row for anyone else you want to let in.
4. In **Authentication → URL Configuration**:
   - **Site URL**: your Vercel address, e.g. `https://personal-gallery-urs4.vercel.app`
   - **Redirect URLs**: add `http://localhost:3000/auth/callback`,
     `https://personal-gallery-urs4.vercel.app/auth/callback`, and one wildcard for preview
     deployments in the form Vercel uses for your previews, e.g.
     `https://personal-gallery-*.vercel.app/auth/callback`.
5. Collect the values:
   - **Project URL**: `https://<project id>.supabase.co`, where the project ID is in **Project
     Settings → General** (or in the dashboard's address bar, after `/project/`). If you copy an
     address from the dashboard that has more on the end (like `/rest/v1/`), that's fine: the app
     keeps only the `https://….supabase.co` part.
   - **Publishable key**: **Project Settings → API Keys**, starts `sb_publishable_`.
   - **Secret key**: same page, under secret keys, starts `sb_secret_`. Needed to hang works that
     nobody has hung before.
   - **Contact email** for museum APIs (`SALON_CONTACT_EMAIL`).

   Put them in `.env.local` (see the table above).

6. In Vercel, **Settings → Environment Variables**, add the same four variables (for Production and
   Preview; mark the secret key **Sensitive**), then redeploy.
7. Sign in at `/login` with your allowlisted email. Open the link **in the same browser** you
   requested it from (the link is tied to that browser for security). The welcome page asks for
   your gallery's address and name, then opens your private gallery.

Optional: **Continue with Google**. In Google Cloud Console → APIs & Services → Credentials,
create an **OAuth client ID** (Web application) with the redirect URI that Supabase shows under
**Authentication → Sign In / Providers → Google**, then paste the client ID and secret into that
Supabase page and enable it.

Supabase's built-in email sender only sends a few emails an hour. That's fine for a personal
project; set up your own SMTP under **Authentication → Emails** if you ever need more.

## Deploying to Vercel

1. Go to https://vercel.com/new and import the `Personal_Gallery` GitHub repository.
2. Vercel detects Next.js; leave the build settings as they are.
3. Under **Environment Variables**, add `NEXT_PUBLIC_APP_MODE` = `personal` and the two Supabase
   variables (see [Setting up Supabase](#setting-up-supabase)).
4. Click **Deploy**. Every push to the production branch redeploys; other branches get preview
   URLs.
