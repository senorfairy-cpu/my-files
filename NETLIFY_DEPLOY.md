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
- `NETLIFY_SITE_ID`: this Netlify site's project/site ID
- `NETLIFY_AUTH_TOKEN`: a Netlify personal access token with access to this site, used by Netlify Blobs

If `PORTFOLIO_ADMIN_PASSWORD` is not set, the password falls back to `admin123`. Change it before going public.

## How live editing works

- Frontend reads the published data from `/api/portfolio`.
- Admin loads and saves draft data with `/api/draft`.
- Admin publishes draft data to the frontend with `POST /api/publish`.
- Uploaded images go through `POST /api/upload`.
- On Netlify, portfolio data and uploaded images are stored in Netlify Blobs.
- On local `npm start`, the same API writes to `data/portfolio.json` and `public/assets/uploads`.

The first Netlify read uses `data/portfolio.json` as seed data. After the first admin publish, Netlify Blobs becomes the live published source of truth. Saving in the admin only updates the draft; the frontend changes only after publishing.
