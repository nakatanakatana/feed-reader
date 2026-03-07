import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import { createRoot } from "solid-js";
import {
  ItemService,
  type ItemBlockRule as ProtoItemBlockRule,
  type URLParsingRule as ProtoURLParsingRule,
} from "../gen/item/v1/item_pb";
import { queryClient, transport } from "./query";

export interface URLParsingRule {
  id: string;
  domain: string;
  ruleType: string;
  pattern: string;
}

export interface ItemBlockRule {
  id: string;
  ruleType: string;
  value: string;
  domain?: string;
}

const itemClient = createClient(ItemService, transport);

export const urlParsingRules = createRoot(() =>
  createCollection(
    queryCollectionOptions({
      id: "url-rules",
      queryClient,
      queryKey: ["url-rules"],
      gcTime: 5 * 1000,
      queryFn: async () => {
        const response = await itemClient.listURLParsingRules({});
        return response.rules.map((rule: ProtoURLParsingRule) => ({
          id: rule.id,
          domain: rule.domain,
          ruleType: rule.ruleType,
          pattern: rule.pattern,
        }));
      },
      getKey: (rule: URLParsingRule) => rule.id,
      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          if (mutation.type === "insert") {
            await itemClient.addURLParsingRule({
              domain: mutation.modified.domain,
              ruleType: mutation.modified.ruleType,
              pattern: mutation.modified.pattern,
            });
          }
        }
        // Invalidate to get the real IDs from the server
        await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          if (mutation.type === "delete") {
            await itemClient.deleteURLParsingRule({
              id: mutation.key as string,
            });
          }
        }
      },
    }),
  ),
);

export const itemBlockRules = createRoot(() =>
  createCollection(
    queryCollectionOptions({
      id: "block-rules",
      queryClient,
      queryKey: ["block-rules"],
      gcTime: 5 * 1000,
      queryFn: async () => {
        const response = await itemClient.listItemBlockRules({});
        return response.rules.map((rule: ProtoItemBlockRule) => ({
          id: rule.id,
          ruleType: rule.ruleType,
          value: rule.value,
          domain: rule.domain,
        }));
      },
      getKey: (rule: ItemBlockRule) => rule.id,
      onInsert: async ({ transaction }) => {
        const rulesToInsert = transaction.mutations
          .filter((m) => m.type === "insert")
          .map((m) => ({
            ruleType: m.modified.ruleType,
            value: m.modified.value,
            domain: m.modified.domain,
          }));

        if (rulesToInsert.length > 0) {
          await itemClient.addItemBlockRules({ rules: rulesToInsert });
        }
        await queryClient.invalidateQueries({ queryKey: ["block-rules"] });
      },
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          if (mutation.type === "delete") {
            await itemClient.deleteItemBlockRule({
              id: mutation.key as string,
            });
          }
        }
      },
    }),
  ),
);
