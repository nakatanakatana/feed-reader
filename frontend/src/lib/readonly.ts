import { getConfig } from "../config";

/** Sole UI gate for omitting mutation controls in readonly builds. */
export function isReadOnly(): boolean {
  return getConfig().readOnly;
}
