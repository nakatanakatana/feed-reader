import { createClient } from "@connectrpc/connect";
import { ItemService } from "../gen/item/v1/item_pb";
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

export const urlParsingRulesQueryOptions = {
  queryKey: ["url-rules"] as const,
  queryFn: async () => {
    const response = await itemClient.listURLParsingRules({});
    return response.rules.map((rule) => ({
      id: rule.id,
      domain: rule.domain,
      ruleType: rule.ruleType,
      pattern: rule.pattern,
    }));
  },
};

export const urlParsingRuleInsert = async (
  domain: string,
  ruleType: string,
  pattern: string,
) => {
  await itemClient.addURLParsingRule({ domain, ruleType, pattern });
  await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
};

export const urlParsingRuleDelete = async (id: string) => {
  await itemClient.deleteURLParsingRule({ id });
  await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
};

export const itemBlockRulesQueryOptions = {
  queryKey: ["block-rules"] as const,
  queryFn: async () => {
    const response = await itemClient.listItemBlockRules({});
    return response.rules.map((rule) => ({
      id: rule.id,
      ruleType: rule.ruleType,
      value: rule.value,
      domain: rule.domain,
    }));
  },
};

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
