package httpapi

import (
	"encoding/xml"
	"strings"
)

// ExportFeed is a feed entry for OPML export.
type ExportFeed struct {
	Title   string
	XmlURL  string
	HtmlURL string
	Tags    []string
	Type    string
}

type opmlOutline struct {
	Text     string        `xml:"text,attr"`
	Title    string        `xml:"title,attr"`
	XMLURL   string        `xml:"xmlUrl,attr"`
	HTMLURL  string        `xml:"htmlUrl,attr,omitempty"`
	Category string        `xml:"category,attr,omitempty"`
	Type     string        `xml:"type,attr,omitempty"`
	Outlines []opmlOutline `xml:"outline,omitempty"`
}

type opmlBody struct {
	Outlines []opmlOutline `xml:"outline"`
}

type opmlHead struct {
	Title string `xml:"title"`
}

type opmlDoc struct {
	XMLName xml.Name `xml:"opml"`
	Version string   `xml:"version,attr"`
	Head    opmlHead `xml:"head"`
	Body    opmlBody `xml:"body"`
}

// ExportOPML serializes feeds to an OPML document.
func ExportOPML(feeds []ExportFeed) ([]byte, error) {
	outlines := make([]opmlOutline, len(feeds))
	for i, f := range feeds {
		feedType := f.Type
		if feedType == "" {
			feedType = "rss" // Default to rss if unknown
		}

		outline := opmlOutline{
			Text:    f.Title,
			Title:   f.Title,
			XMLURL:  f.XmlURL,
			HTMLURL: f.HtmlURL,
			Type:    feedType,
		}

		if len(f.Tags) > 0 {
			outline.Category = strings.Join(f.Tags, ",")
		}

		outlines[i] = outline
	}

	doc := opmlDoc{
		Version: "2.0",
		Head: opmlHead{
			Title: "Exported Feeds",
		},
		Body: opmlBody{
			Outlines: outlines,
		},
	}

	output, err := xml.MarshalIndent(doc, "", "  ")
	if err != nil {
		return nil, err
	}

	return append([]byte(xml.Header), output...), nil
}
