import { describe, it } from "vitest";
import * as fc from "fast-check";

describe("PBT Self-check", () => {
  it("should verify addition commutativity", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      }),
    );
  });
});
