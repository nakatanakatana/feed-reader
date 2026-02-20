import { createClient } from "@connectrpc/connect";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/solid-db";
import { BlockingService } from "../gen/blocking/v1/blocking_pb";
import { queryClient, transport } from "./query";

export interface BlockingRule {
  id: string;
  ruleType: string;
  username?: string;
  domain?: string;
  keyword?: string;
  createdAt: string;
  updatedAt: string;
}

export interface URLParsingRule {
  id: string;
  domain: string;
  pattern: string;
  createdAt: string;
  updatedAt: string;
}

const blockingClient = createClient(BlockingService, transport);

export const blockingRules = createCollection(
  queryCollectionOptions({
    id: "blocking-rules",
    queryClient,
    queryKey: ["blocking-rules"],
    queryFn: async () => {
      const response = await blockingClient.listBlockingRules({});
      return response.rules.map((rule) => ({
        id: rule.id,
        ruleType: rule.ruleType,
        username: rule.username,
        domain: rule.domain,
        keyword: rule.keyword,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }));
    },
    getKey: (rule: BlockingRule) => rule.id,
  }),
);

export const createBlockingRule = async (params: {
  ruleType: string;
  username?: string;
  domain?: string;
  keyword?: string;
}) => {
  await blockingClient.createBlockingRule(params);
  await queryClient.invalidateQueries({ queryKey: ["blocking-rules"] });
  // Invalidate items as some might have become hidden
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const bulkCreateBlockingRules = async (
  rules: {
    ruleType: string;
    username?: string;
    domain?: string;
    keyword?: string;
  }[],
) => {
  await blockingClient.bulkCreateBlockingRules({ rules });
  await queryClient.invalidateQueries({ queryKey: ["blocking-rules"] });
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const deleteBlockingRule = async (id: string) => {
  await blockingClient.deleteBlockingRule({ id });
  await queryClient.invalidateQueries({ queryKey: ["blocking-rules"] });
  // Invalidate items as some might have become visible
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const urlParsingRules = createCollection(
  queryCollectionOptions({
    id: "url-parsing-rules",
    queryClient,
    queryKey: ["url-parsing-rules"],
    queryFn: async () => {
      const response = await blockingClient.listURLParsingRules({});
      return response.rules.map((rule) => ({
        id: rule.id,
        domain: rule.domain,
        pattern: rule.pattern,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      }));
    },
    getKey: (rule: URLParsingRule) => rule.id,
  }),
);

export const createURLParsingRule = async (params: {
  domain: string;
  pattern: string;
}) => {
  await blockingClient.createURLParsingRule(params);
  await queryClient.invalidateQueries({ queryKey: ["url-parsing-rules"] });
  // Invalidate items as usernames might have changed, affecting blocking
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const deleteURLParsingRule = async (id: string) => {
  await blockingClient.deleteURLParsingRule({ id });
  await queryClient.invalidateQueries({ queryKey: ["url-parsing-rules"] });
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const reevaluateAllItems = async () => {
  await blockingClient.reevaluateAllItems({});
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};
