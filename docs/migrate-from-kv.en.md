# Moving from Url-Shorten-Worker

English | [繁體中文](migrate-from-kv.md)

If you've been using [Url-Shorten-Worker](https://github.com/crazypeace/Url-Shorten-Worker), this guide moves your existing links over. Every link you already shared keeps working afterwards.

It takes about 15 minutes. Your old KV data is only read, never changed, and the old service keeps running until you switch the domain in step 5, so you can stop at any point.

## What gets moved

| Old data | Result |
|---|---|
| Regular links (slug → URL) | Imported |
| `slug-count` (only exists if visit_count was on) | Becomes that link's click count |
| `password` | Skipped; the password is now set with `ADMIN_PASSWORD` |
| 128-character keys (only exist if unique_link was on) | Skipped; not needed |
| Values that aren't URLs (image host, pastebin modes) | Skipped; this project only shortens links |
| Slugs that are reserved words (such as `admin`) | Skipped and listed in the result |

You can run the import as many times as you like. Slugs that already exist are skipped, never overwritten.

## Steps

### 1. Deploy the new version

Deploy as described in the [README](../README.en.md#deploy), but **don't** add your domain yet, because it's still in use by the old service.

Then check that you can log in at `https://short-url.your-subdomain.workers.dev/admin`.

### 2. Find the old KV namespace ID

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/), choose **Workers & Pages** on the left, and click your **old** Worker.
2. Go to **Bindings**. There's a KV namespace bound under the variable name `LINKS`. Note its name.
3. Choose **Storage & Databases** → **Workers KV** on the left and find the namespace with that name.
4. Copy its **ID**, a 32-character string of letters and digits.

### 3. Connect the old KV to the new Worker

Open `wrangler.jsonc` in your repo and find these lines:

```jsonc
  // "kv_namespaces": [
  //   { "binding": "LEGACY_KV", "id": "<your old KV namespace ID>" }
  // ],
```

Remove the `// ` at the start of all three lines and replace `<your old KV namespace ID>` with the ID you copied, so it looks like this:

```jsonc
  "kv_namespaces": [
    { "binding": "LEGACY_KV", "id": "0123456789abcdef0123456789abcdef" }
  ],
```

Then redeploy:

- **If you used the deploy button**: edit the file on GitHub. Open `wrangler.jsonc` in your repo, click the pencil icon at the top right, make the change, and click **Commit changes**. Cloudflare redeploys automatically in a minute or two.
- **If you deployed manually**: save the file and run `npm run deploy`.

Don't add the binding on the Bindings page in the dashboard. The next deploy replaces it with what's in the config file.

### 4. Import

1. Reload the new `/admin`. An "Import from old KV" section appears at the bottom.
2. Click "Start import".
3. Look over the skipped list and check that everything in it is expected from the table above.

The imported links show up in the list right away. Try a few on the workers.dev URL, such as `https://short-url.your-subdomain.workers.dev/some-old-slug`, to check that they redirect.

### 5. Move your domain to the new version

1. In the dashboard, open your **old** Worker → **Settings** → **Domains & Routes** and remove your domain (or route).
2. Open the **new** Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**, and add the same domain.

It takes effect within seconds to a few minutes. Try a few old short links on your domain to check that they redirect.

The old admin page was at `your-domain/your-password`. It's now at `your-domain/admin`.

### 6. Clean up

After a few days, once everything works:

1. Put the `// ` back in front of the three `kv_namespaces` lines in `wrangler.jsonc` (or delete them) and redeploy.
2. Delete the old Worker and the old KV namespace in the dashboard.

## Troubleshooting

- **"Import from old KV" doesn't appear**: the deploy from step 3 may still be running, or `wrangler.jsonc` has a mistake. Check the latest deploy under **Deployments** on the new Worker in the dashboard.
- **You want to go back**: before step 5 there's nothing to undo; the old service never stopped. After step 5, remove the domain from the new Worker and add it back to the old one.
- **The import fails on a very large namespace**: the import runs in a single request and handles a few thousand keys comfortably. If yours is large enough to fail, please open an issue.
