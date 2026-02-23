export type BlockRuleType = "user" | "domain" | "user_domain" | "keyword";

export interface ParsedBlockRule {
  ruleType: string;
  value: string;
  domain?: string;
  isValid: boolean;
  error?: string;
}

const VALID_TYPES: BlockRuleType[] = ["user", "domain", "user_domain", "keyword"];

/**
 * Minimal RFC4180-style CSV parser.
 * - Supports quoted fields.
 * - Supports escaped quotes inside quoted fields ("").
 * - Handles commas and newlines inside quoted fields.
 */
function parseCSVRows(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = "";
  };

  const pushRow = () => {
    // Only push non-empty rows (at least one field or non-empty first field)
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    currentRow = [];
  };

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];

    if (char === '"') {
      if (inQuotes && i + 1 < csv.length && csv[i + 1] === '"') {
        // Escaped quote ("")
        currentField += '"';
        i++; // Skip the next quote
      } else {
        // Entering or leaving quoted field
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator
      pushField();
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      // End of record (handle CR, LF, or CRLF)
      // If this is CRLF, skip the LF
      if (char === "\r" && i + 1 < csv.length && csv[i + 1] === "\n") {
        i++;
      }
      pushField();
      pushRow();
    } else {
      currentField += char;
    }
  }

  // Flush last field/row if any
  pushField();
  pushRow();

  return rows;
}

export function parseCSVBlockRules(csv: string): ParsedBlockRule[] {
  const rows = parseCSVRows(csv);
  const results: ParsedBlockRule[] = [];

  for (const rawRow of rows) {
    // Trim each field to preserve existing behavior
    const parts = rawRow.map((p) => p.trim());

    // Skip rows that are effectively empty
    if (parts.every((p) => p === "")) {
      continue;
    }

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
