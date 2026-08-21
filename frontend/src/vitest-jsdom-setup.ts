import { afterEach, expect, vi } from "vitest";
import "./styles.css";

if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
}

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Custom snapshot serializer to format HTML strings.
expect.addSnapshotSerializer({
  test: (val) => {
    if (typeof val !== "string") return false;
    const trimmed = val.trim();
    return /^<([a-zA-Z][a-zA-Z0-9-]*)[\s\S]*>$/.test(trimmed);
  },
  print: (val, serialize) => {
    const trimmed = String(val).trim();
    try {
      const template = document.createElement("template");
      template.innerHTML = trimmed;
      if (template.content.childNodes.length === 0 && trimmed.length > 0) {
        return serialize(val);
      }
      return serialize(template.content);
    } catch {
      return serialize(val);
    }
  },
});

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.useRealTimers();
  vi.clearAllMocks();
});
