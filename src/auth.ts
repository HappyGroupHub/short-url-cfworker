export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

export async function passwordMatches(given: string, expected: string): Promise<boolean> {
  // Hashing first makes the comparison length-independent.
  return constantTimeEqual(await sha256(given), await sha256(expected));
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

// The token is "<expiry>.<signature>", signed with the admin password, so
// changing the password logs out every existing session.
export async function createSessionToken(password: string, nowSeconds: number): Promise<string> {
  const expires = nowSeconds + SESSION_TTL_SECONDS;
  return `${expires}.${await sign(password, `session:${expires}`)}`;
}

export async function verifySessionToken(
  password: string,
  token: string,
  nowSeconds: number,
): Promise<boolean> {
  const [expiresText, signature, ...rest] = token.split(".");
  if (rest.length > 0 || !expiresText || !signature) return false;
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires <= nowSeconds) return false;
  const expected = await sign(password, `session:${expires}`);
  return constantTimeEqual(encoder.encode(signature), encoder.encode(expected));
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
