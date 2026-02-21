import { describe, expect, it } from "vitest";
import { parseBulkBlockingRules } from "./blocking-db";

describe("parseBulkBlockingRules", () => {
  it("should parse multiple rules correctly", () => {
    const input = `
      user_domain,spammer,example.com,
      keyword,,,badword
      user_domain,,spam-only.com,
      user_domain,user-only,,
    `;
    const result = parseBulkBlockingRules(input);
    expect(result).toEqual([
      { ruleType: "user_domain", username: "spammer", domain: "example.com" },
      { ruleType: "keyword", keyword: "badword" },
      { ruleType: "user_domain", domain: "spam-only.com" },
      { ruleType: "user_domain", username: "user-only" },
    ]);
  });

  it("should skip empty lines and invalid lines", () => {
    const input = `
      
      invalid_type,a,b,c
      user_domain,,,
      keyword,,,
    `;
    const result = parseBulkBlockingRules(input);
    expect(result).toEqual([]);
  });

  it("should handle whitespace correctly", () => {
    const input = "  user_domain ,  spammer , example.com  ,  ";
    const result = parseBulkBlockingRules(input);
    expect(result).toEqual([
      { ruleType: "user_domain", username: "spammer", domain: "example.com" },
    ]);
  });
});
