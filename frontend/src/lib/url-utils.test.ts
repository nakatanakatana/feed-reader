import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { normalizeUrl } from "./url-utils";

describe("url-utils PBT", () => {
  it("should always return a string starting with http when input is non-empty", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (url) => {
        const normalized = normalizeUrl(url);
        if (normalized) {
          expect(normalized.toLowerCase()).toMatch(/^https?:\/\//);
        }
      }),
    );
  });

  it("should be idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (url) => {
        const first = normalizeUrl(url);
        const second = normalizeUrl(first);
        expect(first).toBe(second);
      }),
    );
  });
});
