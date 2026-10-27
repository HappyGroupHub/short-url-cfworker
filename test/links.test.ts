import { describe, expect, it } from "vitest";
import { SLUG_ALPHABET, normalizeUrl, randomSlug, validateSlug, withQuery } from "../src/links";

describe("validateSlug", () => {
  it.each(["abc", "My-Link_2", "活動", "v1.2", "a~b"])("accepts %s", (slug) => {
    expect(validateSlug(slug)).toBeNull();
  });

  it.each(["", "a/b", "a b", ".hidden", "a?b", "a#b", "a%20", "x".repeat(65)])("rejects %j", (slug) => {
    expect(validateSlug(slug)).toBe("invalid_slug");
  });

  it.each(["admin", "API", "favicon.svg"])("rejects reserved %s", (slug) => {
    expect(validateSlug(slug)).toBe("reserved_slug");
  });
});

describe("randomSlug", () => {
  it("uses only the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const slug = randomSlug();
      expect(slug).toHaveLength(6);
      for (const char of slug) expect(SLUG_ALPHABET).toContain(char);
    }
  });
});

describe("normalizeUrl", () => {
  it("accepts and trims http(s) URLs", () => {
    expect(normalizeUrl("  https://example.com/a?b=1 ")).toBe("https://example.com/a?b=1");
    expect(normalizeUrl("http://localhost:8787")).toBe("http://localhost:8787");
  });

  it.each(["javascript:alert(1)", "ftp://example.com", "example.com", "", "https://", 42, null])(
    "rejects %j",
    (input) => {
      expect(normalizeUrl(input)).toBeNull();
    },
  );
});

describe("withQuery", () => {
  it("returns the target unchanged without a query", () => {
    expect(withQuery("https://example.com/x", "")).toBe("https://example.com/x");
  });

  it("merges the request query into the target", () => {
    expect(withQuery("https://example.com/x?a=1", "?b=2&c=3")).toBe("https://example.com/x?a=1&b=2&c=3");
  });
});
