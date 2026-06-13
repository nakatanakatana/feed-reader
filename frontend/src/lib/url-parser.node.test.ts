import { describe, expect, it } from "vitest";
import { URLParser, type URLParsingRuleMinimal } from "./url-parser";

describe("URLParser", () => {
  const rules: URLParsingRuleMinimal[] = [
    {
      ruleType: "subdomain",
      pattern: "example.com",
    },
    {
      ruleType: "path",
      pattern: "domain.com/users",
    },
  ];

  const parser = new URLParser(rules);

  it("extracts user from subdomain correctly", () => {
    const result = parser.extractUserInfo("https://user1.example.com/post");
    expect(result).toEqual({ user: "user1", domain: "example.com" });
  });

  it("extracts user from path correctly", () => {
    const result = parser.extractUserInfo(
      "https://domain.com/users/user2/post",
    );
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
