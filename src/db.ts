import type { Link } from "./types";

// The schema is created on first use, so a fresh deploy needs no migration
// step. To change it later, append a new entry; never edit an old one.
const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE IF NOT EXISTS links (
      slug TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      clicks INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_clicked_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS links_created_at ON links (created_at DESC)`,
  ],
];

let schemaReady: Promise<void> | undefined;

export function ensureSchema(db: D1Database): Promise<void> {
  schemaReady ??= migrate(db).catch((error) => {
    schemaReady = undefined;
    throw error;
  });
  return schemaReady;
}

async function migrate(db: D1Database): Promise<void> {
  await db.prepare("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)").run();
  const row = await db.prepare("SELECT MAX(version) AS version FROM schema_version").first<{ version: number | null }>();
  const current = row?.version ?? 0;
  if (current >= MIGRATIONS.length) return;
  const statements = MIGRATIONS.slice(current).flat().map((sql) => db.prepare(sql));
  statements.push(db.prepare("INSERT INTO schema_version (version) VALUES (?)").bind(MIGRATIONS.length));
  await db.batch(statements);
}

export async function findUrl(db: D1Database, slug: string): Promise<string | null> {
  return db.prepare("SELECT url FROM links WHERE slug = ?").bind(slug).first<string>("url");
}

export async function getLink(db: D1Database, slug: string): Promise<Link | null> {
  return db.prepare("SELECT * FROM links WHERE slug = ?").bind(slug).first<Link>();
}

export async function recordClick(db: D1Database, slug: string, now: number): Promise<void> {
  await db
    .prepare("UPDATE links SET clicks = clicks + 1, last_clicked_at = ? WHERE slug = ?")
    .bind(now, slug)
    .run();
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function listLinks(
  db: D1Database,
  query: string,
  limit: number,
  offset: number,
): Promise<{ items: Link[]; total: number }> {
  const where = query ? "WHERE slug LIKE ?1 ESCAPE '\\' OR url LIKE ?1 ESCAPE '\\' OR note LIKE ?1 ESCAPE '\\'" : "";
  const params = query ? [`%${escapeLike(query)}%`] : [];
  const [rows, count] = await db.batch([
    db
      .prepare(`SELECT * FROM links ${where} ORDER BY created_at DESC, slug LIMIT ${limit} OFFSET ${offset}`)
      .bind(...params),
    db.prepare(`SELECT COUNT(*) AS total FROM links ${where}`).bind(...params),
  ]);
  return {
    items: rows.results as Link[],
    total: (count.results[0] as { total: number }).total,
  };
}

/** Returns false if the slug is already taken. */
export async function insertLink(
  db: D1Database,
  link: { slug: string; url: string; note: string },
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO links (slug, url, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (slug) DO NOTHING`,
    )
    .bind(link.slug, link.url, link.note, now, now)
    .run();
  return result.meta.changes > 0;
}

export async function updateLink(
  db: D1Database,
  slug: string,
  changes: { url?: string; note?: string },
  now: number,
): Promise<Link | null> {
  return db
    .prepare(
      `UPDATE links SET url = COALESCE(?, url), note = COALESCE(?, note), updated_at = ?
       WHERE slug = ? RETURNING *`,
    )
    .bind(changes.url ?? null, changes.note ?? null, now, slug)
    .first<Link>();
}

export async function deleteLink(db: D1Database, slug: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM links WHERE slug = ?").bind(slug).run();
  return result.meta.changes > 0;
}
