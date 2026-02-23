import type { AddItemBlockRulesRequest } from "../../gen/item/v1/item_pb";
import { itemClient } from "./client";

export const listURLParsingRules = async () => {
  const resp = await itemClient.listURLParsingRules({});
  return resp.rules;
};

export const addItemBlockRules = async (req: AddItemBlockRulesRequest) => {
  const resp = await itemClient.addItemBlockRules(req);
  return resp;
};
