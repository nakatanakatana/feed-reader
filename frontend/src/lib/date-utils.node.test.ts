import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";
import { dateToTimestamp, toDate } from "./date-utils";

describe("date-utils", () => {
  it("converts Date to Timestamp", () => {
    const date = new Date("2026-03-01T12:34:56.789Z");
    const ts = dateToTimestamp(date);

    expect(ts.seconds).toBe(BigInt(1772368496));
    expect(ts.nanos).toBe(789000000);
  });

  it("converts Timestamp to Date", () => {
    const d = toDate({
      seconds: BigInt(1772368496),
      nanos: 789000000,
    } as Timestamp);

    expect(d?.toISOString()).toBe("2026-03-01T12:34:56.789Z");
  });

  it("returns Date as-is", () => {
    const input = new Date("2026-03-01T00:00:00Z");
    expect(toDate(input)).toBe(input);
  });

  it("parses valid ISO strings and rejects invalid strings", () => {
    expect(toDate("2026-03-01T00:00:00Z")?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(toDate("not-a-date")).toBeUndefined();
  });
});
