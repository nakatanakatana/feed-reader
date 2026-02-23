import type { URLParsingRule } from "../gen/item/v1/item_pb";

export interface ExtractedUserInfo {
  user: string;
  domain: string;
}

export class URLParser {
  constructor(private rules: URLParsingRule[]) {}

  extractUserInfo(urlStr: string): ExtractedUserInfo | null {
    try {
      const url = new URL(urlStr);
      const domainPart = url.hostname;

      for (const rule of this.rules) {
        if (rule.ruleType === "subdomain") {
          // Expected pattern: <user>.<rule.pattern>
          // Example: rule.pattern = "example.com", url = "https://user1.example.com/post"
          if (domainPart.endsWith(`.${rule.pattern}`)) {
            const user = domainPart.slice(0, -(rule.pattern.length + 1));
            if (user !== "" && !user.includes(".")) {
              return {
                user,
                domain: rule.pattern,
              };
            }
          }
        } else if (rule.ruleType === "path") {
          // Expected pattern: <rule.pattern>/<user>
          // Example: rule.pattern = "domain.com/users", url = "https://domain.com/users/user1/post"
          const fullPath = url.hostname + url.pathname;
          if (fullPath.startsWith(`${rule.pattern}/`)) {
            const remaining = fullPath.slice(rule.pattern.length + 1);
            const user = remaining.split("/")[0];
            if (user !== "") {
              // Extract domain from pattern
              const domain = rule.pattern.split("/")[0];
              return {
                user,
                domain,
              };
            }
          }
        }
      }
    } catch (_e) {
      return null;
    }
    return null;
  }
}
