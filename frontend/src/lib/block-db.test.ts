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
    it("urlParsingRules.onInsert should trigger RPC and invalidation", async () => {
      if (!urlParsingRulesOptions.onInsert)
        throw new Error("onInsert not defined");

      const rpcSpy = vi.fn();
      worker.use(
        http.all("*/item.v1.ItemService/AddURLParsingRule", async ({ request }) => {
          const body = await request.json();
          rpcSpy(body);
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

      expect(rpcSpy).toHaveBeenCalledWith({
        domain: "test.com",
        ruleType: "subdomain",
        pattern: "test",
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["url-rules"],
      });
    });

    it("itemBlockRules.onInsert should trigger RPC and invalidation", async () => {
      if (!itemBlockRulesOptions.onInsert)
        throw new Error("onInsert not defined");

      const rpcSpy = vi.fn();
      worker.use(
        http.all("*/item.v1.ItemService/AddItemBlockRules", async ({ request }) => {
          const body = await request.json();
          rpcSpy(body);
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

      expect(rpcSpy).toHaveBeenCalledWith({
        rules: [{ ruleType: "user", value: "bad-user" }],
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["block-rules"],
      });
    });

    it("urlParsingRules.onDelete should skip RPC for temporary IDs", async () => {
      if (!urlParsingRulesOptions.onDelete)
        throw new Error("onDelete not defined");

      const rpcSpy = vi.fn();
      worker.use(
        http.all("*/item.v1.ItemService/DeleteURLParsingRule", async ({ request }) => {
          const body = await request.json();
          rpcSpy(body);
          return HttpResponse.json({});
        }),
      );

      const transaction = {
        mutations: [
          {
            type: "delete",
            key: "temp-uuid",
          },
        ],
      };

      await urlParsingRulesOptions.onDelete({
        // biome-ignore lint/suspicious/noExplicitAny: mock
        transaction: transaction as any,
        // biome-ignore lint/suspicious/noExplicitAny: mock
        collection: {} as any,
      });

      expect(rpcSpy).not.toHaveBeenCalled();
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["url-rules"],
      });
    });
  });
});
