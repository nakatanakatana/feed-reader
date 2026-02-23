export type BlockRuleType = "user" | "domain" | "user_domain" | "keyword";

export interface ParsedBlockRule {
  rule_type: string;
  value: string;
  domain?: string;
  isValid: boolean;
  error?: string;
}

export function parseCSVBlockRules(csv: string): ParsedBlockRule[] {
  const lines = csv.split("\n");
  const results: ParsedBlockRule[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());
    const [rule_type, value, domain] = parts;

    const result: ParsedBlockRule = {
      rule_type: rule_type || "",
      value: value || "",
      isValid: true,
    };

    if (domain) {
      result.domain = domain;
    }

    // Validation
    const validTypes: BlockRuleType[] = [
      "user",
      "domain",
      "user_domain",
      "keyword",
    ];
    if (!validTypes.includes(rule_type as BlockRuleType)) {
      result.isValid = false;
      result.error = "Invalid rule type";
    } else if (!value) {
      result.isValid = false;
      result.error = "Missing value";
    } else if (rule_type === "user_domain" && !domain) {
      result.isValid = false;
      result.error = "Missing domain for user_domain";
    }

    results.push(result);
  }

  return results;
}
