import { create } from "@bufbuild/protobuf";
import { TimestampSchema } from "@bufbuild/protobuf/wkt";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

export const dateToTimestamp = (d: Date): Timestamp => {
  return create(TimestampSchema, {
    seconds: BigInt(Math.floor(d.getTime() / 1000)),
    nanos: (d.getTime() % 1000) * 1000000,
  });
};

export const toDate = (
  ts: Date | Timestamp | string | undefined,
): Date | undefined => {
  if (!ts) return undefined;
  if (ts instanceof Date) return ts;
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return new Date(Number(ts.seconds) * 1000 + ts.nanos / 1000000);
};
