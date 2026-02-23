export type BlockRuleType = "user" | "domain" | "user_domain" | "keyword";

export interface ParsedBlockRule {
  ruleType: string;
  value: string;
  domain?: string;
  isValid: boolean;
  error?: string;
}

const VALID_TYPES: BlockRuleType[] = [
  "user",
  "domain",
  "user_domain",
  "keyword",
];

export function parseCSVBlockRules(csv: string): ParsedBlockRule[] {
  const lines = csv.split("\n");
  const results: ParsedBlockRule[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());
    const [ruleType, value, domain] = parts;

    const result: ParsedBlockRule = {
      ruleType: ruleType || "",
      value: value || "",
      isValid: true,
    };

    if (domain) {
      result.domain = domain;
    }

    // Validation
    if (!VALID_TYPES.includes(ruleType as BlockRuleType)) {
      result.isValid = false;
      result.error = "Invalid rule type";
    } else if (!value) {
      result.isValid = false;
      result.error = "Missing value";
    } else if (ruleType === "user_domain" && !domain) {
      result.isValid = false;
      result.error = "Missing domain for user_domain";
    }

    results.push(result);
  }

  return results;
}
