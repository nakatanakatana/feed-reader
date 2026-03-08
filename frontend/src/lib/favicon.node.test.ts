import { describe, expect, it } from "vitest";
import {
  FAVICON_COLORS,
  FaviconColor,
  generateFaviconUri,
  getFaviconColor,
} from "./favicon";

describe("getFaviconColor", () => {
  it("returns Blue for 0-199 unread items", () => {
    expect(getFaviconColor(0)).toBe(FaviconColor.Blue);
    expect(getFaviconColor(100)).toBe(FaviconColor.Blue);
    expect(getFaviconColor(199)).toBe(FaviconColor.Blue);
  });

  it("returns Orange for 200-999 unread items", () => {
    expect(getFaviconColor(200)).toBe(FaviconColor.Orange);
    expect(getFaviconColor(500)).toBe(FaviconColor.Orange);
    expect(getFaviconColor(999)).toBe(FaviconColor.Orange);
  });

  it("returns Red for 1000+ unread items", () => {
    expect(getFaviconColor(1000)).toBe(FaviconColor.Red);
    expect(getFaviconColor(5000)).toBe(FaviconColor.Red);
  });
});

describe("generateFaviconUri", () => {
  it("generates a valid SVG data URI", () => {
    const color = FaviconColor.Blue;
    const uri = generateFaviconUri(color);

    // Check for Data URI prefix
    expect(uri).toMatch(/^data:image\/svg\+xml;base64,/);

    // Decode base64 and check for color
    const base64 = uri.split(",")[1];
    const svg = atob(base64);

    // Check that the SVG contains the color hex code
    expect(svg).toContain(FAVICON_COLORS[color]);
    // Check that it looks like an SVG
    expect(svg).toContain("<svg");
  });
});
