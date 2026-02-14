package main

import (
	"encoding/xml"
	"strings"
)

type OpmlFeed struct {
	Title string
	URL   string
	Tags  []string
}

type ExportFeed struct {
	Title   string
	XmlURL  string
	HtmlURL string
	Tags    []string
}

type opmlOutline struct {
	Text     string        `xml:"text,attr"`
	Title    string        `xml:"title,attr"`
	XMLURL   string        `xml:"xmlUrl,attr"`
	HTMLURL  string        `xml:"htmlUrl,attr,omitempty"`
	Category string        `xml:"category,attr,omitempty"`
	Type     string        `xml:"type,attr"`
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

func ParseOPML(content []byte) ([]OpmlFeed, error) {
	var doc opmlDoc
	if err := xml.Unmarshal(content, &doc); err != nil {
		return nil, err
	}

	var feeds []OpmlFeed
	var extract func([]opmlOutline, []string)
	extract = func(outlines []opmlOutline, parentTags []string) {
		for _, o := range outlines {
			if o.XMLURL != "" {
				title := o.Title
				if title == "" {
					title = o.Text
				}

				tags := append([]string{}, parentTags...)
				if o.Category != "" {
					cats := strings.Split(o.Category, ",")
					for _, c := range cats {
						c = strings.TrimSpace(c)
						if c != "" {
							tags = append(tags, c)
						}
					}
				}

				feeds = append(feeds, OpmlFeed{
					Title: title,
					URL:   o.XMLURL,
					Tags:  tags,
				})
			}
			if len(o.Outlines) > 0 {
				newParentTags := append([]string{}, parentTags...)
				folderName := o.Title
				if folderName == "" {
					folderName = o.Text
				}
				if folderName != "" {
					newParentTags = append(newParentTags, folderName)
				}
				extract(o.Outlines, newParentTags)
			}
		}
	}
	extract(doc.Body.Outlines, []string{})
	return feeds, nil
}

func ExportOPML(feeds []ExportFeed) ([]byte, error) {
	outlines := make([]opmlOutline, len(feeds))
	for i, f := range feeds {
		outlines[i] = opmlOutline{
			Text:     f.Title,
			Title:    f.Title,
			XMLURL:   f.XmlURL,
			HTMLURL:  f.HtmlURL,
			Category: strings.Join(f.Tags, ","),
			Type:     "rss",
		}
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
