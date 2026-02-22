package main

import (
	"strings"

	"github.com/nakatanakatana/feed-reader/store"
)

// URLParser extracts user info from URLs based on rules.
type URLParser struct {
	rules []store.UrlParsingRule
}

func NewURLParser(rules []store.UrlParsingRule) *URLParser {
	return &URLParser{rules: rules}
}

// ExtractUserInfo attempts to extract user information from the given URL.
func (p *URLParser) ExtractUserInfo(urlStr string) *store.ExtractedUserInfo {
	// Simple implementation: check each rule.
	// For better performance with many rules, we could index by domain.
	for _, rule := range p.rules {
		if rule.RuleType == "subdomain" {
			// Expected pattern: <user>.<rule.Pattern>
			// Example: rule.Pattern = "example.com", url = "https://user1.example.com/post"
			// Extract domain part from URL first
			domainPart := getDomainFromURL(urlStr)
			if strings.HasSuffix(domainPart, "."+rule.Pattern) {
				user := strings.TrimSuffix(domainPart, "."+rule.Pattern)
				if user != "" && !strings.Contains(user, ".") {
					return &store.ExtractedUserInfo{
						User:   user,
						Domain: rule.Pattern,
					}
				}
			}
		} else if rule.RuleType == "path" {
			// Expected pattern: <rule.Pattern>/<user>
			// Example: rule.Pattern = "domain.com/users", url = "https://domain.com/users/user1/post"
			if strings.Contains(urlStr, "://"+rule.Pattern+"/") {
				parts := strings.Split(urlStr, "://"+rule.Pattern+"/")
				if len(parts) > 1 {
					userPart := parts[1]
					user := strings.Split(userPart, "/")[0]
					if user != "" {
						// Extract domain from pattern
						domain := strings.Split(rule.Pattern, "/")[0]
						return &store.ExtractedUserInfo{
							User:   user,
							Domain: domain,
						}
					}
				}
			}
		}
	}
	return nil
}

func getDomainFromURL(urlStr string) string {
	parts := strings.Split(urlStr, "://")
	if len(parts) < 2 {
		return ""
	}
	remaining := parts[1]
	domain := strings.Split(remaining, "/")[0]
	// Remove port if present
	domain = strings.Split(domain, ":")[0]
	return domain
}
