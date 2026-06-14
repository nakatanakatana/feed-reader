import { describe, it, expect } from "vitest";
import { tagsList } from "./generated/client/tagsList";
import { tagsListQueryOptions } from "./generated/queries/createTagsList";

describe("Kubb generated API surface", () => {
  it("exports tagsList fetch function", () => {
    expect(typeof tagsList).toBe("function");
  });

  it("exports tagsListQueryOptions", () => {
    expect(typeof tagsListQueryOptions).toBe("function");
    const opts = tagsListQueryOptions();
    expect(opts.queryKey).toBeDefined();
  });
});
