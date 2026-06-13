import { bytesToBase64 } from "./base64";
import type { components } from "./types";

type RefreshFeedsRequest = components["schemas"]["RefreshFeedsRequest"];
type UpdateItemStatusRequest = components["schemas"]["UpdateItemStatusRequest"];
type ImportOpmlRequest = components["schemas"]["ImportOpmlRequest"];

export const mapRefreshFeedsRequest = (ids: string[]): RefreshFeedsRequest => ({
  ids,
});

export const mapUpdateItemStatusRequest = (
  ids: string[],
  isRead: boolean,
): UpdateItemStatusRequest => ({
  ids,
  isRead,
});

export const mapImportOpmlRequest = (
  opmlContent: Uint8Array,
): ImportOpmlRequest => ({
  opmlContent: bytesToBase64(opmlContent),
});
