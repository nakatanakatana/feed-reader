package main

import (
	"net/url"
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
	u, err := url.Parse(urlStr)
	if err != nil {
		return nil
	}
	domainPart := u.Hostname()

	// Simple implementation: check each rule.
	// For better performance with many rules, we could index by domain.
	for _, rule := range p.rules {
		switch rule.RuleType {
		case "subdomain":
			// Expected pattern: <user>.<rule.Pattern>
			// Example: rule.Pattern = "example.com", url = "https://user1.example.com/post"
			if strings.HasSuffix(domainPart, "."+rule.Pattern) {
				user := strings.TrimSuffix(domainPart, "."+rule.Pattern)
				if user != "" && !strings.Contains(user, ".") {
					return &store.ExtractedUserInfo{
						User:   user,
						Domain: rule.Pattern,
					}
				}
			}
		case "path":
			// Expected pattern: <rule.Pattern>/<user>
			// Example: rule.Pattern = "domain.com/users", url = "https://domain.com/users/user1/post"
			fullPath := u.Host + u.Path
			if strings.HasPrefix(fullPath, rule.Pattern+"/") {
				remaining := strings.TrimPrefix(fullPath, rule.Pattern+"/")
				user := strings.Split(remaining, "/")[0]
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
	return nil
}
