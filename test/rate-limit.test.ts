import { describe, expect, it } from "vitest";
import { clientKey } from "../src/rate-limit";

describe("clientKey", () => {
  it("keeps IPv4 addresses as they are", () => {
    expect(clientKey("203.0.113.7")).toBe("203.0.113.7");
  });

  it("groups IPv6 addresses by /64", () => {
    expect(clientKey("2001:db8:85a3:12:8a2e:370:7334:1")).toBe("2001:db8:85a3:12::/64");
    expect(clientKey("2001:db8:85a3:12::2")).toBe("2001:db8:85a3:12::/64");
    expect(clientKey("2001:0DB8:0000:0012:ffff::")).toBe("2001:db8:0:12::/64");
  });

  it("expands :: in the network part", () => {
    expect(clientKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(clientKey("::1")).toBe("0:0:0:0::/64");
  });

  it("unwraps IPv4-mapped addresses", () => {
    expect(clientKey("::ffff:192.0.2.1")).toBe("192.0.2.1");
  });

  it("falls back when there is no IP", () => {
    expect(clientKey(null)).toBe("unknown");
  });
});
