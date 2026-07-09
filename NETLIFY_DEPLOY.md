# Netlify deploy notes

This site supports live admin edits on Netlify through Netlify Functions and Netlify Blobs.

## Deploy settings

Use these settings in Netlify:

- Publish directory: `public`
- Functions directory: `netlify/functions`
- Build command: leave empty, or use a no-op command

The same settings are already defined in `netlify.toml`.

## Environment variables

Set these in Netlify site settings:

- `PORTFOLIO_ADMIN_PASSWORD`: admin password for `/admin.html`
- `PORTFOLIO_SESSION_SECRET`: a long random string used to sign admin sessions

If `PORTFOLIO_ADMIN_PASSWORD` is not set, the password falls back to `admin123`. Change it before going public.

## How live editing works

- Frontend reads `/api/portfolio`.
- Admin saves JSON changes with `POST /api/portfolio`.
- Uploaded images go through `POST /api/upload`.
- On Netlify, portfolio data and uploaded images are stored in Netlify Blobs.
- On local `npm start`, the same API writes to `data/portfolio.json` and `public/assets/uploads`.

The first Netlify read uses `data/portfolio.json` as seed data. After the first admin save, Netlify Blobs becomes the live source of truth.
