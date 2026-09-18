# Shohoz-Kitchen

Online store for **Shohoz Kitchen** — a single-vendor kitchenware business in Bangladesh that imports from China.
This monorepo holds both halves of the product:

| Folder | What it is | Stack |
|---|---|---|
| [`ShohozKitchen_Client/`](ShohozKitchen_Client) | Storefront + admin dashboard | Next.js 16 (App Router), React 19, TypeScript, Redux Toolkit / RTK Query, Tailwind CSS v4 |
| [`ShohozKitchen_Server/`](ShohozKitchen_Server) | REST API | Express 4, TypeScript, Mongoose 8 (MongoDB Atlas), JWT auth, Zod validation |

Courier: **Steadfast** (booking, status sync, returns). Currency: BDT (৳); purchases are tracked in RMB (¥) and BDT.

## Getting started

Requirements: Node.js 20+ and a MongoDB Atlas database.

```bash
# 1. Install both apps (each keeps its own node_modules and lockfile)
npm run install:all

# 2. Environment
cp ShohozKitchen_Server/.env.example ShohozKitchen_Server/.env          # fill in DATABASE_URL, JWT secrets, …
cp ShohozKitchen_Client/.env.example ShohozKitchen_Client/.env.local    # NEXT_PUBLIC_API_URL etc.

# 3. Run the API (http://localhost:5000) and the web app (http://localhost:3000) together
npm run dev
```

| Script | Does |
|---|---|
| `npm run dev` | API + web together, output labelled `[api]` / `[web]` |
| `npm run dev:api` / `npm run dev:web` | Just one of them |
| `npm run build` | Builds the API, then the web app |
| `npm run typecheck` | `tsc --noEmit` in both apps |
| `npm run lint:web` | ESLint on the web app |

Creating the first admin: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (or `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`) in `ShohozKitchen_Server/.env`, then run
`npx ts-node --transpile-only src/scripts/setup-admin.ts` (or `setup-superadmin.ts`) from `ShohozKitchen_Server/`.

## Deploying

- **Web (Vercel):** import the repo and set **Root Directory** to `ShohozKitchen_Client`.
- **API (Render):** New → Blueprint → pick this repo. [`render.yaml`](render.yaml) builds from `ShohozKitchen_Server/`; add the secrets in the Render dashboard.

## Conventions

- **Single vendor.** The inherited multi-vendor system was removed on purpose — no shops, sellers, commission or seller payouts. `order.packages[]` now means shipments (one per order); the courier integration depends on it.
- **Brand colour** is `--color-primary` in `ShohozKitchen_Client/src/app/globals.css`. Use `var(--color-primary)` / `rgba(var(--color-primary-rgb), .12)`, never a hard-coded hex. Status colours stay semantic (green = active/paid, amber = warning, red = error).
- **Admin pages** are built from the shared kit in `ShohozKitchen_Client/src/components/admin/ui.tsx`. The sidebar in `AdminLayout.tsx` tracks each menu's progress against the client's requirements.
- **New API module:** copy `ShohozKitchen_Server/src/app/modules/coupon/` (model, validation, service, controller, routes) and mount it in `src/app.ts`.
- **Secrets never go in code.** This repository is public — keep keys, database URLs and passwords in `.env` only.
