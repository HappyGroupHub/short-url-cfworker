import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, createSessionToken, passwordMatches, readCookie, verifySessionToken } from "../src/auth";

const NOW = 1_800_000_000;

describe("passwordMatches", () => {
  it("compares passwords", async () => {
    expect(await passwordMatches("hunter2", "hunter2")).toBe(true);
    expect(await passwordMatches("hunter3", "hunter2")).toBe(false);
    expect(await passwordMatches("", "hunter2")).toBe(false);
  });
});

describe("session tokens", () => {
  it("verifies a fresh token", async () => {
    const token = await createSessionToken("secret", NOW);
    expect(await verifySessionToken("secret", token, NOW + 60)).toBe(true);
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken("secret", NOW);
    expect(await verifySessionToken("secret", token, NOW + SESSION_TTL_SECONDS)).toBe(false);
  });

  it("rejects a token after the password changes", async () => {
    const token = await createSessionToken("secret", NOW);
    expect(await verifySessionToken("new-secret", token, NOW)).toBe(false);
  });

  it("rejects a token with an extended expiry", async () => {
    const token = await createSessionToken("secret", NOW);
    const [, signature] = token.split(".");
    expect(await verifySessionToken("secret", `${NOW + 10 * SESSION_TTL_SECONDS}.${signature}`, NOW)).toBe(false);
  });

  it.each(["", "garbage", "1.2.3", `${NOW + 100}.`])("rejects malformed token %j", async (token) => {
    expect(await verifySessionToken("secret", token, NOW)).toBe(false);
  });
});

describe("readCookie", () => {
  it("finds a cookie by name", () => {
    const request = new Request("https://x.test/", { headers: { Cookie: "a=1; session=abc.def; b=2" } });
    expect(readCookie(request, "session")).toBe("abc.def");
    expect(readCookie(request, "missing")).toBeNull();
  });
});
