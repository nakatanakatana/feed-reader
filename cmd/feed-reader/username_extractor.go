package main

import (
	"net/url"
	"regexp"
	"sync"

	"github.com/nakatanakatana/feed-reader/store"
)

type UsernameExtractor interface {
	Extract(itemURL string, rules []store.UrlParsingRule) (string, error)
}

type usernameExtractor struct {
	cache sync.Map // map[string]*regexp.Regexp
}

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
			var re *regexp.Regexp
			if val, ok := e.cache.Load(rule.Pattern); ok {
				re = val.(*regexp.Regexp)
			} else {
				var err error
				re, err = regexp.Compile(rule.Pattern)
				if err != nil {
					return "", err
				}
				e.cache.Store(rule.Pattern, re)
			}

			matches := re.FindStringSubmatch(itemURL)
			if len(matches) > 1 {
				return matches[1], nil
			}
		}
	}

	return "", nil
}
