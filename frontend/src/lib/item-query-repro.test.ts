import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";
import { itemKeys } from "./item-query";

describe("Item Query Serialization", () => {
  it("should be able to serialize query keys with BigInt", () => {
    const timestamp = { seconds: BigInt(123), nanos: 0 } as Timestamp;
    const keys = itemKeys.list({ since: timestamp });

    // TanStack Query (and JSON) fails to serialize BigInt by default.
    // This test reproduces the crash.
    expect(() => JSON.stringify(keys)).not.toThrow();
  });
});
