import {
  SESSION_COOKIE,
  clearedSessionCookie,
  createSessionToken,
  passwordMatches,
  readCookie,
  sessionCookie,
  verifySessionToken,
} from "./auth";
import { deleteLink, getLink, insertLink, listLinks, updateLink } from "./db";
import { importFromKv } from "./import-kv";
import { MAX_NOTE_LENGTH, normalizeUrl, randomSlug, validateSlug } from "./links";
import { clearLoginAttempts, clientKey, registerLoginAttempt } from "./rate-limit";
import type { Env } from "./types";

const MAX_PAGE_SIZE = 100;
const RANDOM_SLUG_ATTEMPTS = 5;

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
  });
}

function error(code: string, status: number): Response {
  return json({ error: code }, status);
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_PASSWORD) return false;
  const token = readCookie(request, SESSION_COOKIE);
  return token !== null && verifySessionToken(env.ADMIN_PASSWORD, token, now());
}

// Requests that change data must be JSON from this same site. Browsers can't
// send that cross-site without CORS, which this API never allows.
function isSameSiteJson(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  return (request.headers.get("Content-Type") ?? "").startsWith("application/json");
}

function readNote(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > MAX_NOTE_LENGTH) return null;
  return value.trim();
}

export async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;

  if (method !== "GET" && !isSameSiteJson(request)) return error("bad_request", 400);

  if (path === "/api/session" && method === "GET") {
    return json({
      configured: Boolean(env.ADMIN_PASSWORD),
      authenticated: await isAuthenticated(request, env),
      legacyKv: Boolean(env.LEGACY_KV),
    });
  }

  if (path === "/api/login" && method === "POST") {
    if (!env.ADMIN_PASSWORD) return error("not_configured", 503);
    const client = clientKey(request.headers.get("CF-Connecting-IP"));
    const attempt = await registerLoginAttempt(env.DB, client, now());
    if (!attempt.allowed) {
      return json({ error: "too_many_attempts", retryAfter: attempt.retryAfter }, 429, {
        "Retry-After": String(attempt.retryAfter),
      });
    }
    const body = await readJson(request);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!(await passwordMatches(password, env.ADMIN_PASSWORD))) {
      // Slow down password guessing a little.
      await new Promise((resolve) => setTimeout(resolve, 500));
      return json({ error: "wrong_password", remaining: attempt.remaining }, 401);
    }
    await clearLoginAttempts(env.DB, client);
    const token = await createSessionToken(env.ADMIN_PASSWORD, now());
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  if (path === "/api/logout" && method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": clearedSessionCookie() });
  }

  if (!(await isAuthenticated(request, env))) return error("unauthorized", 401);

  if (path === "/api/links" && method === "GET") {
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? "").trim();
    const pageSize = Math.min(Math.max(Number(params.get("pageSize")) || 20, 1), MAX_PAGE_SIZE);
    const page = Math.max(Math.floor(Number(params.get("page"))) || 1, 1);
    const { items, total } = await listLinks(env.DB, query, pageSize, (page - 1) * pageSize);
    return json({ items, total, page, pageSize });
  }

  if (path === "/api/links" && method === "POST") {
    return createLink(request, env);
  }

  if (path === "/api/import-kv" && method === "POST") {
    if (!env.LEGACY_KV) return error("legacy_kv_not_bound", 400);
    return json(await importFromKv(env.LEGACY_KV, env.DB, now()));
  }

  if (path.startsWith("/api/links/")) {
    let slug: string;
    try {
      slug = decodeURIComponent(path.slice("/api/links/".length));
    } catch {
      return error("not_found", 404);
    }
    if (method === "PATCH") return editLink(request, env, slug);
    if (method === "DELETE") {
      return (await deleteLink(env.DB, slug)) ? json({ ok: true }) : error("not_found", 404);
    }
  }

  return error("not_found", 404);
}

async function createLink(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  if (!body) return error("bad_request", 400);

  const url = normalizeUrl(body.url);
  if (!url) return error("invalid_url", 400);
  const note = readNote(body.note);
  if (note === null) return error("invalid_note", 400);

  const customSlug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (customSlug) {
    const slugError = validateSlug(customSlug);
    if (slugError) return error(slugError, 400);
    if (!(await insertLink(env.DB, { slug: customSlug, url, note: note ?? "" }, now()))) {
      return error("slug_taken", 409);
    }
    return json({ link: await getLink(env.DB, customSlug) }, 201);
  }

  for (let attempt = 0; attempt < RANDOM_SLUG_ATTEMPTS; attempt++) {
    const slug = randomSlug();
    if (await insertLink(env.DB, { slug, url, note: note ?? "" }, now())) {
      return json({ link: await getLink(env.DB, slug) }, 201);
    }
  }
  return error("slug_generation_failed", 500);
}

async function editLink(request: Request, env: Env, slug: string): Promise<Response> {
  const body = await readJson(request);
  if (!body) return error("bad_request", 400);

  let url: string | undefined;
  if (body.url !== undefined) {
    const normalized = normalizeUrl(body.url);
    if (!normalized) return error("invalid_url", 400);
    url = normalized;
  }
  const note = readNote(body.note);
  if (note === null) return error("invalid_note", 400);

  let newSlug: string | undefined;
  if (body.slug !== undefined) {
    if (typeof body.slug !== "string") return error("invalid_slug", 400);
    const trimmed = body.slug.trim();
    if (trimmed !== slug) {
      const slugError = validateSlug(trimmed);
      if (slugError) return error(slugError, 400);
      newSlug = trimmed;
    }
  }

  const link = await updateLink(env.DB, slug, { slug: newSlug, url, note }, now());
  if (link) return json({ link });
  return (await getLink(env.DB, slug)) ? error("slug_taken", 409) : error("not_found", 404);
}
