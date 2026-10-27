import { normalizeUrl, validateSlug } from "./links";

// Imports links from a KV namespace used by crazypeace/Url-Shorten-Worker,
// where each key is a slug and each value is the target URL. That project
// also stores a few other kinds of keys, which are skipped or merged here.

export type LegacyEntry =
  | { kind: "link"; slug: string; url: string }
  | { kind: "count"; slug: string; clicks: number }
  | { kind: "skip"; reason: "protected" | "unique_link_hash" | "not_a_url" | "invalid_slug" | "reserved_slug" };

export function classifyLegacyEntry(key: string, value: string | null): LegacyEntry {
  if (key === "password") return { kind: "skip", reason: "protected" };
  if (key.endsWith("-count")) {
    const clicks = Number(value);
    return { kind: "count", slug: key.slice(0, -"-count".length), clicks: Number.isInteger(clicks) && clicks > 0 ? clicks : 0 };
  }
  // With unique_link on, the SHA-512 of each URL maps back to its slug.
  if (/^[0-9a-f]{128}$/.test(key)) return { kind: "skip", reason: "unique_link_hash" };
  const url = normalizeUrl(value);
  if (!url) return { kind: "skip", reason: "not_a_url" };
  const slugError = validateSlug(key);
  if (slugError) return { kind: "skip", reason: slugError };
  return { kind: "link", slug: key, url };
}

export interface ImportResult {
  imported: number;
  skipped: { key: string; reason: string }[];
}

const KV_BULK_GET_LIMIT = 100;
const D1_BATCH_SIZE = 50;

export async function importFromKv(kv: KVNamespace, db: D1Database, now: number): Promise<ImportResult> {
  const keys: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ cursor });
    keys.push(...page.keys.map((key) => key.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const values = new Map<string, string | null>();
  for (let i = 0; i < keys.length; i += KV_BULK_GET_LIMIT) {
    const chunk = await kv.get(keys.slice(i, i + KV_BULK_GET_LIMIT), "text");
    for (const [key, value] of chunk) values.set(key, value);
  }

  const links: { slug: string; url: string }[] = [];
  const clicks = new Map<string, number>();
  const skipped: ImportResult["skipped"] = [];
  for (const key of keys) {
    const entry = classifyLegacyEntry(key, values.get(key) ?? null);
    if (entry.kind === "link") links.push(entry);
    else if (entry.kind === "count") clicks.set(entry.slug, entry.clicks);
    else skipped.push({ key, reason: entry.reason });
  }

  let imported = 0;
  for (let i = 0; i < links.length; i += D1_BATCH_SIZE) {
    const chunk = links.slice(i, i + D1_BATCH_SIZE);
    const results = await db.batch(
      chunk.map((link) =>
        db
          .prepare(
            `INSERT INTO links (slug, url, clicks, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (slug) DO NOTHING`,
          )
          .bind(link.slug, link.url, clicks.get(link.slug) ?? 0, now, now),
      ),
    );
    results.forEach((result, index) => {
      if (result.meta.changes > 0) imported++;
      else skipped.push({ key: chunk[index].slug, reason: "already_exists" });
    });
  }

  return { imported, skipped };
}
