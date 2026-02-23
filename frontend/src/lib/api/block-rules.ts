import { create } from "@bufbuild/protobuf";
import { AddItemBlockRulesRequestSchema } from "../../gen/item/v1/item_pb";
import { itemClient } from "./client";

export const listURLParsingRules = async () => {
  const resp = await itemClient.listURLParsingRules({});
  return resp.rules;
};

// biome-ignore lint/suspicious/noExplicitAny: allow plain object
export const addItemBlockRules = async (req: any) => {
  const resp = await itemClient.addItemBlockRules(
    create(AddItemBlockRulesRequestSchema, req),
  );
  return resp;
};
