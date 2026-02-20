import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";
import "./styles.css";
import { resetDatabase } from "./lib/db";
import { itemStore } from "./lib/item-store";
import { worker } from "./mocks/browser";
import { resetState } from "./mocks/handlers";

// Force UTC timezone for consistent snapshot testing
const originalToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions,
) {
  return originalToLocaleString.call(this, locales || "en-US", {
    ...options,
    timeZone: "UTC",
  });
};

// Custom snapshot serializer to format HTML strings
expect.addSnapshotSerializer({
  test: (val) => {
    if (typeof val !== "string") return false;
    const trimmed = val.trim();
    // Check if it starts with an HTML tag-like pattern: <tag ... > or <tag> or <tag/>
    // Case-insensitive, tag name must start with a letter
    return /^<([a-zA-Z][a-zA-Z0-9-]*)[\s\S]*>$/.test(trimmed);
  },
  print: (val, serialize) => {
    const trimmed = (val as string).trim();
    try {
      // Basic check for document as this might be used in multiple test environments
      if (typeof document === "undefined") {
        return serialize(val);
      }
      const template = document.createElement("template");
      template.innerHTML = trimmed;
      // If innerHTML couldn't be parsed into meaningful content, return original
      if (template.content.childNodes.length === 0 && trimmed.length > 0) {
        return serialize(val);
      }
      return serialize(template.content);
    } catch {
      // Fallback to default serialization if parsing fails for any reason
      return serialize(val);
    }
  },
});

beforeAll(async () => {
  await worker.start({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  worker.resetHandlers();
  resetState();
  resetDatabase();
  itemStore.reset();
  vi.useRealTimers();
  vi.clearAllMocks();
});

afterAll(() => {
  worker.stop();
});
