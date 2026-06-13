import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64 } from "./base64";

describe("base64 helpers", () => {
  it("round trips bytes", () => {
    const bytes = new TextEncoder().encode("<opml></opml>");

    expect(new TextDecoder().decode(base64ToBytes(bytesToBase64(bytes)))).toBe(
      "<opml></opml>",
    );
  });

  it("encodes OPML bytes for OpenAPI byte payloads", () => {
    const bytes = new TextEncoder().encode("<opml></opml>");

    expect(bytesToBase64(bytes)).toBe("PG9wbWw+PC9vcG1sPg==");
    expect(
      new TextDecoder().decode(base64ToBytes("PG9wbWw+PC9vcG1sPg==")),
    ).toBe("<opml></opml>");
  });
});
