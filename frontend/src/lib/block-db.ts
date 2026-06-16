import { URLRulesAdd } from "./api/generated/client/URLRulesAdd.ts";
import { URLRulesDelete } from "./api/generated/client/URLRulesDelete.ts";
import { URLRulesList } from "./api/generated/client/URLRulesList.ts";
import { blockRulesAdd } from "./api/generated/client/blockRulesAdd.ts";
import { blockRulesDelete } from "./api/generated/client/blockRulesDelete.ts";
import { blockRulesList } from "./api/generated/client/blockRulesList.ts";
import type { components } from "./api/types";
import { queryClient } from "./query";

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

type OpenAPIURLParsingRule = components["schemas"]["URLParsingRule"];
type OpenAPIItemBlockRule = components["schemas"]["ItemBlockRule"];

export const mapConnectURLParsingRule = (
  rule: URLParsingRule,
): URLParsingRule => ({
  id: rule.id,
  domain: rule.domain,
  ruleType: rule.ruleType,
  pattern: rule.pattern,
});

export const mapOpenAPIURLParsingRule = (
  rule: OpenAPIURLParsingRule,
): URLParsingRule => ({
  id: rule.id,
  domain: rule.domain,
  ruleType: rule.ruleType,
  pattern: rule.pattern,
});

export const mapConnectItemBlockRule = (
  rule: ItemBlockRule,
): ItemBlockRule => ({
  id: rule.id,
  ruleType: rule.ruleType,
  value: rule.value,
  domain: rule.domain,
});

export const mapOpenAPIItemBlockRule = (
  rule: OpenAPIItemBlockRule,
): ItemBlockRule => ({
  id: rule.id,
  ruleType: rule.ruleType,
  value: rule.value,
  domain: rule.domain,
});

export const urlParsingRulesQueryOptions = {
  queryKey: ["url-rules"] as const,
  queryFn: async () => {
    const response = await URLRulesList();
    return response.rules.map(mapOpenAPIURLParsingRule);
  },
  staleTime: Infinity,
};

export const urlParsingRuleInsert = async (
  domain: string,
  ruleType: string,
  pattern: string,
) => {
  await URLRulesAdd({ domain, ruleType, pattern });
  await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
};

export const urlParsingRuleDelete = async (id: string) => {
  await URLRulesDelete(id);
  await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
};

export const itemBlockRulesQueryOptions = {
  queryKey: ["block-rules"] as const,
  queryFn: async () => {
    const response = await blockRulesList();
    return response.rules.map(mapOpenAPIItemBlockRule);
  },
};

export const itemBlockRuleInsert = async (
  rules: { ruleType: string; value: string; domain?: string }[],
) => {
  await blockRulesAdd({ rules });
  await queryClient.invalidateQueries({ queryKey: ["block-rules"] });
};

export const itemBlockRuleDelete = async (id: string) => {
  await blockRulesDelete(id);
  await queryClient.invalidateQueries({ queryKey: ["block-rules"] });
};
