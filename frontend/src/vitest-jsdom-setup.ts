import { afterEach, expect, vi } from "vitest";
import "./styles.css";

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
