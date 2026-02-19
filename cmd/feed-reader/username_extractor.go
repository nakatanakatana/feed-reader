package main

import (
	"net/url"
	"regexp"

	"github.com/nakatanakatana/feed-reader/store"
)

type UsernameExtractor interface {
	Extract(itemURL string, rules []store.UrlParsingRule) (string, error)
}

type usernameExtractor struct{}

func NewUsernameExtractor() UsernameExtractor {
	return &usernameExtractor{}
}

func (e *usernameExtractor) Extract(itemURL string, rules []store.UrlParsingRule) (string, error) {
	parsedURL, err := url.Parse(itemURL)
	if err != nil {
		return "", err
	}

	for _, rule := range rules {
		if rule.Domain == parsedURL.Host {
			re, err := regexp.Compile(rule.Pattern)
			if err != nil {
				return "", err
			}

			matches := re.FindStringSubmatch(itemURL)
			if len(matches) > 1 {
				return matches[1], nil
			}
		}
	}

	return "", nil
}
