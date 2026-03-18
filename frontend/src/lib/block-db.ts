import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";

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

export const urlParsingRules = createCollection(
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
    onDelete: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        if (mutation.type === "delete") {
          await itemClient.deleteURLParsingRule({ id: mutation.key as string });
        }
      }
    },
  }),
);

export const urlParsingRuleInsert = async (domain: string, ruleType: string, pattern: string) => {
  await itemClient.addURLParsingRule({ domain, ruleType, pattern });
  await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
};

export const urlParsingRuleDelete = async (id: string) => {
  await itemClient.deleteURLParsingRule({ id });
  await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
};

export const itemBlockRules = createCollection(
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
    onDelete: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        if (mutation.type === "delete") {
          await itemClient.deleteItemBlockRule({ id: mutation.key as string });
        }
      }
    },
  }),
);

export const itemBlockRuleInsert = async (
  rules: { ruleType: string; value: string; domain?: string }[],
) => {
  await itemClient.addItemBlockRules({ rules });
  await queryClient.invalidateQueries({ queryKey: ["block-rules"] });
};

export const itemBlockRuleDelete = async (id: string) => {
  await itemClient.deleteItemBlockRule({ id });
  await queryClient.invalidateQueries({ queryKey: ["block-rules"] });
};
