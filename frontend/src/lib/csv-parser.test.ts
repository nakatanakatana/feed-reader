import { describe, expect, it } from "vitest";
import { parseCSVBlockRules } from "./csv-parser";

describe("parseCSVBlockRules", () => {
  it("parses valid CSV lines", () => {
    const csv = `user,john_doe
domain,example.com
user_domain,jane_doe,example.org
keyword,spam`;
    const result = parseCSVBlockRules(csv);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      ruleType: "user",
      value: "john_doe",
      isValid: true,
    });
    expect(result[1]).toEqual({
      ruleType: "domain",
      value: "example.com",
      isValid: true,
    });
    expect(result[2]).toEqual({
      ruleType: "user_domain",
      value: "jane_doe",
      domain: "example.org",
      isValid: true,
    });
    expect(result[3]).toEqual({
      ruleType: "keyword",
      value: "spam",
      isValid: true,
    });
  });

  it("handles empty lines and whitespace", () => {
    const csv = `
      user , john_doe 
    
    keyword,  spam  
    `;
    const result = parseCSVBlockRules(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      ruleType: "user",
      value: "john_doe",
      isValid: true,
    });
    expect(result[1]).toEqual({
      ruleType: "keyword",
      value: "spam",
      isValid: true,
    });
  });

  it("identifies invalid rule types", () => {
    const csv = "invalid_type,value";
    const result = parseCSVBlockRules(csv);
    expect(result).toHaveLength(1);
    expect(result[0].isValid).toBe(false);
    expect(result[0].error).toBe("Invalid rule type");
  });

  it("identifies missing values", () => {
    const csv = "user,";
    const result = parseCSVBlockRules(csv);
    expect(result).toHaveLength(1);
    expect(result[0].isValid).toBe(false);
    expect(result[0].error).toBe("Missing value");
  });

  it("identifies missing domain for user_domain", () => {
    const csv = "user_domain,jane_doe";
    const result = parseCSVBlockRules(csv);
    expect(result).toHaveLength(1);
    expect(result[0].isValid).toBe(false);
    expect(result[0].error).toBe("Missing domain for user_domain");
  });

  it("identifies rows with too many columns", () => {
    const csv = "user,john_doe,domain,extra";
    const result = parseCSVBlockRules(csv);
    expect(result).toHaveLength(1);
    expect(result[0].isValid).toBe(false);
    expect(result[0].error).toBe("Too many columns");
  });

  it("treats header row as invalid rule entry", () => {
    const csv = `rule_type,value,domain
user,john_doe`;
    const result = parseCSVBlockRules(csv);
    // Header row is treated as data and should be marked invalid.
    expect(result).toHaveLength(2);
    expect(result[0].isValid).toBe(false); // "rule_type" is invalid type
    expect(result[1]).toEqual({
      ruleType: "user",
      value: "john_doe",
      isValid: true,
    });
  });

  it("handles quoted fields and commas inside quotes", () => {
    const csv = `"keyword", "quoted, value"
"user", john_doe`;
    const result = parseCSVBlockRules(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      ruleType: "keyword",
      value: "quoted, value",
      isValid: true,
    });
    expect(result[1]).toEqual({
      ruleType: "user",
      value: "john_doe",
      isValid: true,
    });
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = `keyword, "value with ""quote"""`;
    const result = parseCSVBlockRules(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ruleType: "keyword",
      value: 'value with "quote"',
      isValid: true,
    });
  });
});
