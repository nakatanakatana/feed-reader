import { apiClient } from "./api/client";
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
type ListURLParsingRulesResponse =
  components["schemas"]["ListURLParsingRulesResponse"];
type ListItemBlockRulesResponse =
  components["schemas"]["ListItemBlockRulesResponse"];
type AddURLParsingRuleResponse =
  components["schemas"]["AddURLParsingRuleResponse"];
type EmptyResponse = Record<string, never>;

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
    const response =
      await apiClient.get<ListURLParsingRulesResponse>("/url-rules");
    return response.rules.map(mapOpenAPIURLParsingRule);
  },
};

export const urlParsingRuleInsert = async (
  domain: string,
  ruleType: string,
  pattern: string,
) => {
  await apiClient.post<AddURLParsingRuleResponse>("/url-rules", {
    domain,
    ruleType,
    pattern,
  });
  await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
};

export const urlParsingRuleDelete = async (id: string) => {
  await apiClient.delete<EmptyResponse>(`/url-rules/${id}`);
  await queryClient.invalidateQueries({ queryKey: ["url-rules"] });
};

export const itemBlockRulesQueryOptions = {
  queryKey: ["block-rules"] as const,
  queryFn: async () => {
    const response =
      await apiClient.get<ListItemBlockRulesResponse>("/block-rules");
    return response.rules.map(mapOpenAPIItemBlockRule);
  },
};

export const itemBlockRuleInsert = async (
  rules: { ruleType: string; value: string; domain?: string }[],
) => {
  await apiClient.post<EmptyResponse>("/block-rules", { rules });
  await queryClient.invalidateQueries({ queryKey: ["block-rules"] });
};

export const itemBlockRuleDelete = async (id: string) => {
  await apiClient.delete<EmptyResponse>(`/block-rules/${id}`);
  await queryClient.invalidateQueries({ queryKey: ["block-rules"] });
};
