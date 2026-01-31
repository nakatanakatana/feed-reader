import { describe, it, expect } from "vitest";
import { itemKeys } from "./item-query";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

describe("Item Query Serialization", () => {
  it("should be able to serialize query keys with BigInt", () => {
    const timestamp = { seconds: BigInt(123), nanos: 0 } as Timestamp;
    const keys = itemKeys.list({ publishedSince: timestamp });

    // TanStack Query (and JSON) fails to serialize BigInt by default.
    // This test reproduces the crash.
    expect(() => JSON.stringify(keys)).not.toThrow();
  });
});
