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
  const response = await blockingClient.createBlockingRule(params);
  if (response.rule) {
    const newRule = {
      id: response.rule.id,
      ruleType: response.rule.ruleType,
      username: response.rule.username,
      domain: response.rule.domain,
      keyword: response.rule.keyword,
      createdAt: response.rule.createdAt,
      updatedAt: response.rule.updatedAt,
    };
    queryClient.setQueryData(["blocking-rules"], (old: BlockingRule[] | undefined) =>
      old ? [...old, newRule] : [newRule],
    );
  }
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
  const response = await blockingClient.bulkCreateBlockingRules({ rules });
  const newRules = response.rules.map((rule) => ({
    id: rule.id,
    ruleType: rule.ruleType,
    username: rule.username,
    domain: rule.domain,
    keyword: rule.keyword,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }));
  queryClient.setQueryData(["blocking-rules"], (old: BlockingRule[] | undefined) =>
    old ? [...old, ...newRules] : newRules,
  );
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const deleteBlockingRule = async (id: string) => {
  await blockingClient.deleteBlockingRule({ id });
  queryClient.setQueryData(["blocking-rules"], (old: BlockingRule[] | undefined) =>
    old ? old.filter((r) => r.id !== id) : [],
  );
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
  const response = await blockingClient.createURLParsingRule(params);
  if (response.rule) {
    const newRule = {
      id: response.rule.id,
      domain: response.rule.domain,
      pattern: response.rule.pattern,
      createdAt: response.rule.createdAt,
      updatedAt: response.rule.updatedAt,
    };
    queryClient.setQueryData(["url-parsing-rules"], (old: URLParsingRule[] | undefined) =>
      old ? [...old, newRule] : [newRule],
    );
  }
  // Invalidate items as usernames might have changed, affecting blocking
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const deleteURLParsingRule = async (id: string) => {
  await blockingClient.deleteURLParsingRule({ id });
  queryClient.setQueryData(["url-parsing-rules"], (old: URLParsingRule[] | undefined) =>
    old ? old.filter((r) => r.id !== id) : [],
  );
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export const reevaluateAllItems = async () => {
  await blockingClient.reevaluateAllItems({});
  await queryClient.invalidateQueries({ queryKey: ["items"] });
};

export interface BulkBlockingRuleInput {
  ruleType: string;
  username?: string;
  domain?: string;
  keyword?: string;
}

export function parseBulkBlockingRules(input: string): BulkBlockingRuleInput[] {
  const lines = input.split("\n");
  return lines
    .map((line) => {
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length < 1) return null;
      const [ruleType, username, domain, keyword] = parts;
      if (!ruleType) return null;

      if (ruleType === "user_domain") {
        if (!username && !domain) return null;
        return {
          ruleType,
          username: username || undefined,
          domain: domain || undefined,
        };
      }
      if (ruleType === "keyword") {
        if (!keyword) return null;
        return {
          ruleType,
          keyword,
        };
      }
      return null;
    })
    .filter((r): r is BulkBlockingRuleInput => r !== null);
}
