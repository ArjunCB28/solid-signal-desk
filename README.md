# Signal Desk

A team activity feed where people post short updates (title, body, author name). Built with SolidStart, Cloudflare Pages, and Cloudflare D1.

**Live:** https://signal-desk-xo9.pages.dev

---

## Prerequisites

- Node.js >= 22
- npm
- Wrangler CLI (`npm install -g wrangler` or use via `npx`)
- A Cloudflare account with D1 access

---

## Install

```bash
npm install
```

---

## Local development

Start the dev server (uses local D1 via Wrangler):

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

To run a local preview that mimics the Cloudflare Pages environment:

```bash
npm run build
npx wrangler pages dev dist
```

---

## D1 setup

### Create the database (first time only)

```bash
npx wrangler d1 create signal-desk-db
```

Copy the `database_id` from the output and update `wrangler.jsonc` if needed.

### Apply schema

**Local** (for `npm run dev`):

```bash
npx wrangler d1 execute signal-desk-db --file=./schema.sql
```

**Remote** (for the live Pages deployment — run once after creating the database):

```bash
npx wrangler d1 execute signal-desk-db --file=./schema.sql --remote
```

### Schema changes

When the schema changes, run the appropriate `--remote` command above with a migration SQL file instead of the full schema.

---

## Deploy steps

### First-time setup

1. Create the Pages project:

```bash
npx wrangler pages project create signal-desk
```

2. Build and deploy:

```bash
npm run build
npx wrangler pages deploy dist
```

3. In the Cloudflare dashboard, go to the `signal-desk` Pages project → **Settings** → **Bindings** → **Add** → **D1 Database**:
   - Variable name: `DB`
   - Database: `signal-desk-db`

4. Apply the schema to the remote D1 (once):

```bash
npx wrangler d1 execute signal-desk-db --file=./schema.sql --remote
```

5. Redeploy to pick up the binding:

```bash
npx wrangler pages deploy dist
```

### Subsequent deploys

```bash
npm run build
npx wrangler pages deploy dist
```

---

## Testing

```bash
npm test           # run once
npm run test:watch # watch mode
```

Unit tests cover:
- **`src/lib/sanitize.ts`** — all 5 sanitization functions (HTML stripping, control character removal, character allowlists, length truncation)
- **`src/lib/db.ts`** — all 3 D1 query functions, with `solid-js/web` mocked so no real Cloudflare environment is needed

---

## Architecture

```
src/
  routes/
    index.tsx       # SSR list page + create/delete actions + pagination
  lib/
    db.ts           # D1 queries (getPosts, createPost, deletePost)
    sanitize.ts     # Pure input sanitization helpers
    types.ts        # Post and CreatePostInput interfaces
    index.ts        # Re-exports
schema.sql          # D1 table and index definitions
wrangler.jsonc      # Cloudflare config with D1 binding and nodejs_compat flag
app.config.ts       # SolidStart config (cloudflare-pages preset)
```

### Request flow

1. Browser requests `/` (or `/?page=2`)
2. Cloudflare Pages routes to the SolidStart worker (`_worker.js`)
3. The route's `load` function calls `getPostsData(1)` marked `"use server"` — this runs a paginated D1 query on the server before any HTML is sent
4. SolidStart streams the SSR'd HTML (posts already in the markup) to the browser
5. SolidJS hydrates on the client — no separate data fetch needed on initial load
6. Prev/Next buttons update the `?page` search param, which triggers a new `getPostsData(page)` call server-side; each page is cached independently
7. Create/delete use `action()` with `"use server"` — form posts go to the server, D1 is mutated, `revalidate()` clears the posts cache across all pages, and the feed updates

**Server vs client boundary:** All D1 access is inside `"use server"` functions. The D1 binding and Cloudflare env are never exposed to the client bundle.

---

## Scope and cuts

Estimated time: ~6 hours

| Item | Status | Notes |
| --- | --- | --- |
| SSR list page | Shipped | Posts rendered in HTML on the server via `cache()` + `createAsync()` |
| Create post | Shipped | Form action with server validation |
| Delete post | Shipped | Author-matched delete by name string — **spoofable by design** (no session/auth; anyone can change the hidden `author` input in DevTools). Tradeoff accepted per spec; real auth is in "What I'd do next". |
| D1 persistence | Shipped | Cloudflare D1 with local and remote support |
| Deploy to Cloudflare Pages | Shipped | Live at signal-desk-xo9.pages.dev |
| Real authentication | Cut | Out of scope per instructions |
| Pagination | Shipped | Prev/Next buttons, 5 posts per page, page state in URL (`?page=N`) |
| Optimistic UI | Cut | Full server round-trip on mutations |

---

## What I'd do next

- **Optimistic UI** on create/delete using SolidJS `useSubmission()` so the feed updates instantly without waiting for the server round-trip
- **Post detail route** (`/posts/:id`) with SSR for direct linking
- **Basic auth** via a shared passphrase stored in a Cloudflare secret, so deletes are actually protected
- **D1 integration tests** using `@cloudflare/vitest-pool-workers` to test the full query layer against an in-memory D1 instance
- **Accessibility pass** — focus management after form submit, ARIA labels on the delete button, contrast check
