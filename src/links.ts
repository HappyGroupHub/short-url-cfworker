// Easily confused characters removed: 0 O o 1 I l L 9 g q U u V v
export const SLUG_ALPHABET = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
export const RANDOM_SLUG_LENGTH = 6;
export const MAX_URL_LENGTH = 4096;
export const MAX_NOTE_LENGTH = 500;

// Paths served by the admin page and static files. A link with one of these
// slugs could never be reached, so they can't be used.
export const RESERVED_SLUGS = new Set(["admin", "api", "favicon.svg", "robots.txt"]);

// Letters (any language), digits, and - _ . ~ ; must not start with a dot.
const SLUG_PATTERN = /^[\p{L}\p{N}_~-][\p{L}\p{N}._~-]{0,63}$/u;

export type SlugError = "invalid_slug" | "reserved_slug";

export function validateSlug(slug: string): SlugError | null {
  if (!SLUG_PATTERN.test(slug)) return "invalid_slug";
  if (RESERVED_SLUGS.has(slug.toLowerCase())) return "reserved_slug";
  return null;
}

export function randomSlug(length = RANDOM_SLUG_LENGTH): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % SLUG_ALPHABET.length);
  let slug = "";
  while (slug.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && slug.length < length) {
        slug += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
      }
    }
  }
  return slug;
}

/** Returns the trimmed URL if it is an absolute http(s) URL, otherwise null. */
export function normalizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const url = input.trim();
  if (url.length === 0 || url.length > MAX_URL_LENGTH) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;
  return url;
}

/** Appends the query string of the short link request to the target URL. */
export function withQuery(target: string, search: string): string {
  if (!search || search === "?") return target;
  const url = new URL(target);
  for (const [key, value] of new URLSearchParams(search)) {
    url.searchParams.append(key, value);
  }
  return url.toString();
}
