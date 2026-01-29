package main

import (
	"embed"
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed all:frontend/dist
var frontendAssets embed.FS

type assetsHandler struct {
	fs fs.FS
}

func NewAssetsHandler(assets fs.FS) http.Handler {
	// Try to sub to frontend/dist
	subFS, err := fs.Sub(assets, "frontend/dist")
	if err == nil {
		// Verify it's not empty by checking for index.html
		_, err := subFS.Open("index.html")
		if err == nil {
			return &assetsHandler{fs: subFS}
		}
	}
	// Fallback to the original FS
	return &assetsHandler{fs: assets}
}

func (h *assetsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	upath := r.URL.Path
	if !strings.HasPrefix(upath, "/") {
		upath = "/" + upath
	}
	upath = path.Clean(upath)

	// Try to open the requested file
	name := strings.TrimPrefix(upath, "/")
	if name == "" {
		name = "index.html"
	}

	f, err := h.fs.Open(name)
	if err != nil {
		// Fallback to index.html
		name = "index.html"
		f, err = h.fs.Open(name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if stat.IsDir() {
		// Fallback to index.html in the SAME directory
		f.Close()
		name = path.Join(name, "index.html")
		f, err = h.fs.Open(name)
		if err != nil {
			// Fallback to root index.html
			name = "index.html"
			f, err = h.fs.Open(name)
			if err != nil {
				http.NotFound(w, r)
				return
			}
		}
		defer f.Close()
		stat, _ = f.Stat()
	}

	// Serve content
	rs, ok := f.(io.ReadSeeker)
	if !ok {
		// If not a ReadSeeker (like in some FS implementations), we might need to buffer it.
		// For embed.FS it should be fine if we use the right approach, but let's be safe for tests.
		content, err := io.ReadAll(f)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		http.ServeContent(w, r, name, stat.ModTime(), strings.NewReader(string(content)))
		return
	}

	http.ServeContent(w, r, name, stat.ModTime(), rs)
}