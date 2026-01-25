package main

import (
	"encoding/xml"
)

type OpmlFeed struct {
	Title string
	URL   string
}

type opmlOutline struct {
	Text     string        `xml:"text,attr"`
	Title    string        `xml:"title,attr"`
	XMLURL   string        `xml:"xmlUrl,attr"`
	Type     string        `xml:"type,attr"`
	Outlines []opmlOutline `xml:"outline"`
}

type opmlBody struct {
	Outlines []opmlOutline `xml:"outline"`
}

type opmlDoc struct {
	Body opmlBody `xml:"body"`
}

func ParseOPML(content []byte) ([]OpmlFeed, error) {
	var doc opmlDoc
	if err := xml.Unmarshal(content, &doc); err != nil {
		return nil, err
	}

	var feeds []OpmlFeed
	var extract func([]opmlOutline)
	extract = func(outlines []opmlOutline) {
		for _, o := range outlines {
			if o.XMLURL != "" {
				title := o.Title
				if title == "" {
					title = o.Text
				}
				feeds = append(feeds, OpmlFeed{
					Title: title,
					URL:   o.XMLURL,
				})
			}
			if len(o.Outlines) > 0 {
				extract(o.Outlines)
			}
		}
	}
	extract(doc.Body.Outlines)
	return feeds, nil
}
