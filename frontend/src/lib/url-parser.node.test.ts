import { describe, expect, it } from "vite-plus/test";

import type { URLParsingRule } from "../gen/item/v1/item_pb";
import { URLParser } from "./url-parser";

describe("URLParser", () => {
  const rules: URLParsingRule[] = [
    {
      id: "1",
      domain: "example.com",
      ruleType: "subdomain",
      pattern: "example.com",
    } as URLParsingRule,
    {
      id: "2",
      domain: "domain.com",
      ruleType: "path",
      pattern: "domain.com/users",
    } as URLParsingRule,
  ];

  const parser = new URLParser(rules);

  it("extracts user from subdomain correctly", () => {
    const result = parser.extractUserInfo("https://user1.example.com/post");
    expect(result).toEqual({ user: "user1", domain: "example.com" });
  });

  it("extracts user from path correctly", () => {
    const result = parser.extractUserInfo("https://domain.com/users/user2/post");
    expect(result).toEqual({ user: "user2", domain: "domain.com" });
  });

  it("returns null for non-matching subdomain", () => {
    const result = parser.extractUserInfo("https://other.com/post");
    expect(result).toBeNull();
  });

  it("returns null for non-matching path", () => {
    const result = parser.extractUserInfo("https://domain.com/other/user/post");
    expect(result).toBeNull();
  });

  it("returns null for malformed URL", () => {
    const result = parser.extractUserInfo("not-a-url");
    expect(result).toBeNull();
  });

  it("returns null for nested subdomains", () => {
    const result = parser.extractUserInfo("https://user.sub.example.com/post");
    expect(result).toBeNull();
  });
});
