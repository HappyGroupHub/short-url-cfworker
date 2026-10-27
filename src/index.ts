import { handleApi, json } from "./api";
import { ensureSchema, findUrl, recordClick } from "./db";
import { normalizeUrl, withQuery } from "./links";
import { homePage, notFoundPage } from "./pages";
import type { Env } from "./types";

// Static files in ./public (the admin page) are served before this Worker
// runs, so everything that reaches here is either the API or a short link.
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    try {
      await ensureSchema(env.DB);
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url.pathname);
      return await handleShortLink(request, env, ctx, url);
    } catch (err) {
      console.error(err);
      if (url.pathname.startsWith("/api/")) return json({ error: "internal_error" }, 500);
      return new Response("Internal error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;

async function handleShortLink(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  if (url.pathname === "/") {
    const home = normalizeUrl(env.HOME_URL);
    return home ? Response.redirect(home, 302) : homePage();
  }

  let slug: string;
  try {
    slug = decodeURIComponent(url.pathname.slice(1).replace(/\/$/, ""));
  } catch {
    return notFoundPage();
  }
  if (!slug || slug.includes("/")) return notFoundPage();

  const target = await findUrl(env.DB, slug);
  if (!target) return notFoundPage();

  // Count the click after responding so the redirect isn't slowed down.
  // HEAD requests are usually link-preview bots, so they don't count.
  if (request.method === "GET") {
    ctx.waitUntil(recordClick(env.DB, slug, Math.floor(Date.now() / 1000)).catch((err) => console.error(err)));
  }

  return new Response(null, {
    status: 302,
    headers: { Location: withQuery(target, url.search), "Cache-Control": "no-store" },
  });
}
