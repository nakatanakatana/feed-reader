import { describe, it, expect } from "vitest";
import { itemsGet } from "./generated/client/itemsGet";
import { tagsList } from "./generated/client/tagsList";

describe("Kubb generated API surface", () => {
  it("exports tagsList fetch function", () => {
    expect(typeof tagsList).toBe("function");
  });

  it("exports itemsGet fetch function", () => {
    expect(typeof itemsGet).toBe("function");
  });
});
