import { create, toJson } from "@bufbuild/protobuf";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AddItemBlockRulesResponseSchema,
  AddURLParsingRuleResponseSchema,
} from "../gen/item/v1/item_pb";
import { worker } from "../mocks/browser";
import { itemBlockRulesOptions, urlParsingRulesOptions } from "./block-db";
import { queryClient } from "./query";

describe("block-db", () => {
  beforeEach(() => {
    vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("lifecycle hooks", () => {
    it("urlParsingRules.onInsert should trigger invalidation", async () => {
      if (!urlParsingRulesOptions.onInsert)
        throw new Error("onInsert not defined");

      worker.use(
        http.all("*/item.v1.ItemService/AddURLParsingRule", () => {
          return HttpResponse.json(
            toJson(
              AddURLParsingRuleResponseSchema,
              create(AddURLParsingRuleResponseSchema, {}),
            ),
          );
        }),
      );

      const transaction = {
        mutations: [
          {
            type: "insert",
            modified: {
              domain: "test.com",
              ruleType: "subdomain",
              pattern: "test",
            },
          },
        ],
      };

      await urlParsingRulesOptions.onInsert({
        // biome-ignore lint/suspicious/noExplicitAny: mock
        transaction: transaction as any,
        // biome-ignore lint/suspicious/noExplicitAny: mock
        collection: {} as any,
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["url-rules"],
      });
    });

    it("itemBlockRules.onInsert should trigger invalidation", async () => {
      if (!itemBlockRulesOptions.onInsert)
        throw new Error("onInsert not defined");

      worker.use(
        http.all("*/item.v1.ItemService/AddItemBlockRules", () => {
          return HttpResponse.json(
            toJson(
              AddItemBlockRulesResponseSchema,
              create(AddItemBlockRulesResponseSchema, {}),
            ),
          );
        }),
      );

      const transaction = {
        mutations: [
          {
            type: "insert",
            modified: { ruleType: "user", value: "bad-user" },
          },
        ],
      };

      await itemBlockRulesOptions.onInsert({
        // biome-ignore lint/suspicious/noExplicitAny: mock
        transaction: transaction as any,
        // biome-ignore lint/suspicious/noExplicitAny: mock
        collection: {} as any,
      });

      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["block-rules"],
      });
    });
  });
});
