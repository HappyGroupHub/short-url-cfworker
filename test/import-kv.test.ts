import { describe, expect, it } from "vitest";
import { classifyLegacyEntry } from "../src/import-kv";

describe("classifyLegacyEntry", () => {
  it("imports a normal short link", () => {
    expect(classifyLegacyEntry("abc123", "https://example.com/")).toEqual({
      kind: "link",
      slug: "abc123",
      url: "https://example.com/",
    });
  });

  it("never imports the password entry", () => {
    expect(classifyLegacyEntry("password", "https://example.com/")).toEqual({ kind: "skip", reason: "protected" });
  });

  it("reads visit counters", () => {
    expect(classifyLegacyEntry("abc123-count", "42")).toEqual({ kind: "count", slug: "abc123", clicks: 42 });
    expect(classifyLegacyEntry("abc123-count", "junk")).toEqual({ kind: "count", slug: "abc123", clicks: 0 });
  });

  it("skips unique_link hash entries", () => {
    expect(classifyLegacyEntry("a".repeat(128), "abc123")).toEqual({ kind: "skip", reason: "unique_link_hash" });
  });

  it("skips values that are not URLs, like pastebin or image host entries", () => {
    expect(classifyLegacyEntry("note", "just some text")).toEqual({ kind: "skip", reason: "not_a_url" });
    expect(classifyLegacyEntry("img", "data:image/png;base64,AAAA")).toEqual({ kind: "skip", reason: "not_a_url" });
  });

  it("skips keys that can't be used as slugs", () => {
    expect(classifyLegacyEntry("admin", "https://example.com/")).toEqual({ kind: "skip", reason: "reserved_slug" });
    expect(classifyLegacyEntry("a/b", "https://example.com/")).toEqual({ kind: "skip", reason: "invalid_slug" });
  });
});
