package main

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/nakatanakatana/feed-reader/store"
)

type BlockingService interface {
	ShouldBlock(item store.SaveFetchedItemParams, rules []store.BlockingRule) (bool, string)
}

type blockingService struct{}

func NewBlockingService() BlockingService {
	return &blockingService{}
}

func (s *blockingService) ShouldBlock(item store.SaveFetchedItemParams, rules []store.BlockingRule) (bool, string) {
	parsedURL, _ := url.Parse(item.Url)
	itemDomain := ""
	if parsedURL != nil {
		itemDomain = parsedURL.Host
	}

	for _, rule := range rules {
		switch rule.RuleType {
		case "user_domain":
			if rule.Username == nil && rule.Domain == nil {
				continue // Invalid rule
			}

			matchUsername := true
			if rule.Username != nil {
				matchUsername = item.Username != nil && *rule.Username == *item.Username
			}

			matchDomain := true
			if rule.Domain != nil {
				matchDomain = itemDomain != "" && *rule.Domain == itemDomain
			}

			if matchUsername && matchDomain {
				if rule.Username != nil && rule.Domain != nil {
					return true, fmt.Sprintf("user: %s @ %s", *rule.Username, *rule.Domain)
				} else if rule.Username != nil {
					return true, fmt.Sprintf("username: %s", *rule.Username)
				} else {
					return true, fmt.Sprintf("domain: %s", *rule.Domain)
				}
			}
		case "keyword":
			if rule.Keyword != nil {
				k := strings.ToLower(*rule.Keyword)
				if item.Title != nil && strings.Contains(strings.ToLower(*item.Title), k) {
					return true, fmt.Sprintf("keyword in title: %s", *rule.Keyword)
				}
				if item.Content != nil && strings.Contains(strings.ToLower(*item.Content), k) {
					return true, fmt.Sprintf("keyword in content: %s", *rule.Keyword)
				}
			}
		}
	}

	return false, ""
}
