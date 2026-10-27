function page(title: string, heading: string, message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  :root { color-scheme: light dark; --bg: #f6f7f9; --fg: #1d2129; --muted: #6b7280; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111318; --fg: #e8eaee; --muted: #9aa1ad; } }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", "Noto Sans TC", sans-serif; }
  main { text-align: center; padding: 24px; }
  h1 { font-size: 56px; margin: 0; letter-spacing: -0.02em; }
  p { color: var(--muted); margin: 8px 0 0; }
</style>
</head>
<body><main><h1>${heading}</h1><p>${message}</p></main></body>
</html>`;
}

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
};

export function notFoundPage(): Response {
  return new Response(page("404 Not Found", "404", "這個短網址不存在 · This short link does not exist."), {
    status: 404,
    headers: HTML_HEADERS,
  });
}

export function homePage(): Response {
  return new Response(page("Short links", "🔗", "短網址服務 · Short link service"), {
    headers: HTML_HEADERS,
  });
}
