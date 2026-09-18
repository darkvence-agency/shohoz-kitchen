# Deploying the Shohoz Kitchen client to Vercel

Next.js is auto‑detected by Vercel — the repo only needs the API URL set.

| File | Purpose |
|------|---------|
| `vercel.json` | Explicit framework + build/install commands (Next.js). |
| `.env.vercel` | The environment variable(s) to add in Vercel (gitignored). |
| `next.config.ts` | Already allows Cloudinary/Unsplash image hosts — no change needed. |

## Steps

1. **Import the project**
   Vercel → **Add New… → Project** → import the `ShohozKitchen_Client` GitHub repo.
   Framework preset **Next.js** is detected automatically (build `next build`, install `npm install`).

2. **Set the environment variable**
   Project → **Settings → Environment Variables** → add (from `.env.vercel`):
   - `NEXT_PUBLIC_API_URL` = your Render backend URL **ending in `/api`**
     (e.g. `https://shohozkitchen-server.onrender.com/api`).
   - Set it for **Production** (and Preview if you use preview deploys).
   - ⚠️ `NEXT_PUBLIC_*` is baked in at build time — set it **before** deploying; redeploy after any change.

3. **Deploy** → Vercel builds and gives you a URL (e.g. `https://shohozkitchen-client.vercel.app`).

4. **Point the backend at this URL**
   Back in Render, set `FRONTEND_URL` and `PAYMENT_FRONTEND_URL` to this Vercel URL and redeploy —
   otherwise the backend's CORS will block the browser.

## Notes
- Deploy order that avoids guesswork: **backend (Render) first** → copy its URL into `NEXT_PUBLIC_API_URL` here → deploy client → copy the Vercel URL back into Render's `FRONTEND_URL`.
- Images already work (Cloudinary host is whitelisted in `next.config.ts`).
