// Login attempts allowed per client in each window. Once used up, logins from
// that client are refused until the window ends, whatever the password.
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_WINDOW_SECONDS = 15 * 60;

/**
 * Turns the client IP into the key attempts are counted under. IPv6 addresses
 * are grouped by /64, since anyone with one address usually has the whole /64.
 */
export function clientKey(ip: string | null): string {
  if (!ip) return "unknown";
  if (!ip.includes(":")) return ip;
  // IPv4-mapped IPv6, e.g. ::ffff:192.0.2.1
  if (ip.includes(".")) return ip.slice(ip.lastIndexOf(":") + 1);

  const [head = "", tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = ip.includes("::")
    ? [...left, ...Array<string>(Math.max(8 - left.length - right.length, 0)).fill("0"), ...right]
    : left;
  const prefix = groups.slice(0, 4).map((group) => (parseInt(group || "0", 16) || 0).toString(16));
  return `${prefix.join(":")}::/64`;
}

export type LoginAttempt = { allowed: true; remaining: number } | { allowed: false; retryAfter: number };

/** Counts one login attempt for the client and says whether it may go ahead. */
export async function registerLoginAttempt(db: D1Database, client: string, now: number): Promise<LoginAttempt> {
  // Counting before checking the password means parallel requests can't all
  // slip in under the limit.
  const [, upsert] = await db.batch([
    db.prepare("DELETE FROM login_attempts WHERE window_start <= ?").bind(now - LOGIN_WINDOW_SECONDS),
    db
      .prepare(
        `INSERT INTO login_attempts (client, count, window_start) VALUES (?, 1, ?)
         ON CONFLICT (client) DO UPDATE SET count = count + 1
         RETURNING count, window_start`,
      )
      .bind(client, now),
  ]);
  const row = upsert.results[0] as { count: number; window_start: number };
  if (row.count > MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.max(row.window_start + LOGIN_WINDOW_SECONDS - now, 1) };
  }
  return { allowed: true, remaining: MAX_LOGIN_ATTEMPTS - row.count };
}

export async function clearLoginAttempts(db: D1Database, client: string): Promise<void> {
  await db.prepare("DELETE FROM login_attempts WHERE client = ?").bind(client).run();
}
