# Migrating from Url-Shorten-Worker (KV)

English | [繁體中文](migrate-from-kv.md)

This guide is for people who used [crazypeace/Url-Shorten-Worker](https://github.com/crazypeace/Url-Shorten-Worker), which stores links in Workers KV. The old KV data is never modified, and the old service keeps running until you switch the domain, so you can roll back at any point.

## What gets imported

| Data in the old KV | What happens |
|---|---|
| Regular links (slug → URL) | Imported |
| `slug-count` (click counts with visit_count on) | Merged into that link's click count |
| `password` | Skipped; the new version uses `ADMIN_PASSWORD` |
| 128-character SHA-512 keys (from unique_link) | Skipped; not needed |
| Values that aren't URLs (imghost, pastebin modes) | Skipped; this project only shortens links |
| Slugs that clash with reserved words (e.g. `admin`) | Skipped and listed in the result |

You can run the import more than once. Existing slugs are skipped, never overwritten.

## Steps

### 1. Deploy the new version

Deploy with the button or manually as described in the [README](../README.en.md), but **don't** attach your custom domain yet. Check that you can log in at `https://short-url.<your-account>.workers.dev/admin`.

### 2. Find the old KV namespace ID

Cloudflare dashboard → **Workers & Pages** → your old Worker → **Settings** → **Bindings**. Note the name of the KV namespace bound as `LINKS`.

Then go to **Storage & Databases** → **Workers KV**, find that namespace and copy its **ID**.

### 3. Bind the old KV to the new Worker

In your copy of the repo, uncomment this block in `wrangler.jsonc` and fill in the ID:

```jsonc
"kv_namespaces": [
  { "binding": "LEGACY_KV", "id": "<old KV namespace ID>" }
],
```

- Deployed with the button: edit the file on GitHub and commit; Cloudflare redeploys automatically.
- Deployed manually: save and run `npm run deploy`.

> Don't add the binding in the Cloudflare dashboard. The next deploy replaces it with what's in the config file.

### 4. Import

Reload `/admin`. An "Import from old KV" section appears at the bottom. Click "Start import" and check that the skipped entries are what you expect.

### 5. Switch the domain

1. Old Worker → **Settings** → **Domains & Routes**: remove your custom domain (or route).
2. New Worker → **Settings** → **Domains & Routes** → **Add**: add the same domain.

The switch takes effect within seconds. Try a few old short links to make sure they redirect.

> The old admin page lived at `your-domain/your-password`. It is now at `your-domain/admin`.

### 6. Clean up

Once everything has worked for a few days:

- Remove or re-comment the `kv_namespaces` block in `wrangler.jsonc` and redeploy.
- Delete the old Worker and the old KV namespace.

## Limits

The import runs in a single request and handles a few thousand keys comfortably. If it fails on a very large namespace, please open an issue.
