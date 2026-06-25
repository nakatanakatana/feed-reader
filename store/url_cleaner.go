package store

import (
	"net/url"
	"strings"
)

// CleanURL removes tracking parameters (utm_*, gclid, fbclid, msclkid, yclid) from the URL.
func CleanURL(urlStr string) (string, error) {
	u, err := url.Parse(urlStr)
	if err != nil {
		return "", err
	}

	q := u.Query()
	for key := range q {
		lowerKey := strings.ToLower(key)
		if strings.HasPrefix(lowerKey, "utm_") || isTrackingParam(lowerKey) {
			q.Del(key)
		}
	}

	u.RawQuery = q.Encode()

	return u.String(), nil
}

func isTrackingParam(key string) bool {
	switch key {
	case "gclid", "fbclid", "msclkid", "yclid":
		return true
	}
	return false
}
