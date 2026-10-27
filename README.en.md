# short-url-cfworker

English | [繁體中文](README.md)

A personal URL shortener on Cloudflare Workers, with links stored in D1 and a clean admin page. It runs entirely on Cloudflare's free plan, with no server of your own.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/HappyGroupHub/short-url-cfworker)

## Features

- `your-domain/slug` redirects with a 302, forwarding any query string
- Admin page at `/admin`: create, search, edit and delete links, with optional custom slugs (any language) and notes
- Click counts
- Password login; the password is stored as an encrypted Cloudflare secret
- Traditional Chinese and English UI, light and dark themes, works on phones
- One-click import from the old [Url-Shorten-Worker](https://github.com/crazypeace/Url-Shorten-Worker) (KV version)

## One-click deploy (recommended)

1. Click **Deploy to Cloudflare** above and sign in to Cloudflare.
2. Connect your GitHub account when asked. Cloudflare copies this repo to your GitHub and creates the D1 database for you.
3. Enter an admin password in the `ADMIN_PASSWORD` field. Use a long, random string.
4. Deploy and wait for it to finish.
5. Open `https://<worker-name>.<your-account>.workers.dev/admin` and log in.

From then on, pushing to your copy of the repo redeploys automatically.

## Manual deploy

Requires [Node.js](https://nodejs.org/) 20 or later.

```bash
git clone https://github.com/HappyGroupHub/short-url-cfworker.git
cd short-url-cfworker
npm install
npx wrangler login
npm run deploy
```

On the first deploy, Wrangler asks whether to create a new D1 database; choose to create one. Tables are created automatically on the first request, so there is no migration step.

Then set the admin password:

```bash
npx wrangler secret put ADMIN_PASSWORD
```

## Use your own domain

Cloudflare dashboard → **Workers & Pages** → your Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**, then enter e.g. `s.example.com`. The domain must already be on Cloudflare.

## Configuration

| Name | Type | Description |
|---|---|---|
| `ADMIN_PASSWORD` | Secret (required) | Admin password. Without it, every login is refused. Changing it logs out all sessions. |
| `HOME_URL` | Variable (optional) | Where to send visitors who open the bare domain. Empty shows a simple page. Edit it under `vars` in `wrangler.jsonc`. |
| `LEGACY_KV` | KV binding (optional) | Only needed when migrating from the old version; see below. |

## Migrating from Url-Shorten-Worker

If you used crazypeace/Url-Shorten-Worker (links stored in KV), you can import all your old links, and every link you already shared keeps working. See [docs/migrate-from-kv.en.md](docs/migrate-from-kv.en.md).

## Local development

```bash
cp .dev.vars.example .dev.vars   # then set ADMIN_PASSWORD in it
npm run dev                      # http://localhost:8787/admin/
npm test                         # unit tests
npm run typecheck
```

## Is the free plan enough?

For personal use, almost certainly. The Workers free plan allows 100,000 requests a day; D1 allows 5 million rows read and 100,000 rows written a day.

- Each click: 1 row read + 1 row written (the click counter)
- Each admin search: roughly as many rows read as you have links

So the real ceiling is the Workers limit of 100,000 requests a day, close to 100,000 clicks. Limits reset daily at 00:00 UTC.

## Notes

- **Why 302 and not 301?** Browsers cache 301s permanently, so changing a link's target or counting clicks would stop working.
- **Reserved slugs**: `admin`, `api`, `favicon.svg`, `robots.txt`.
- **Slug rules**: letters (any language), digits and `- _ . ~`; can't start with `.`; at most 64 characters. Random slugs avoid look-alike characters such as `0 O 1 l I`.
- **Click counting**: `HEAD` requests (usually link-preview bots) aren't counted.

## Project layout

```
src/
  index.ts       redirects and routing
  api.ts         admin API (/api/*)
  auth.ts        password and login sessions
  db.ts          D1 schema and queries
  links.ts       slug and URL validation
  import-kv.ts   import from the old KV version
  pages.ts       home and 404 pages
public/
  admin/         admin page (plain HTML / CSS / JS, no build step)
test/            unit tests (Vitest)
```

## License

[MIT](LICENSE)
