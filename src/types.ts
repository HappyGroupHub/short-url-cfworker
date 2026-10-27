export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Secret. The admin page refuses all logins until this is set. */
  ADMIN_PASSWORD?: string;
  /** Where to redirect visitors of the bare domain. Empty = show a simple page. */
  HOME_URL?: string;
  /** Optional. An old Url-Shorten-Worker KV namespace to import links from. */
  LEGACY_KV?: KVNamespace;
}

export interface Link {
  slug: string;
  url: string;
  note: string;
  clicks: number;
  created_at: number;
  updated_at: number;
  last_clicked_at: number | null;
}
