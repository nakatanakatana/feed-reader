import { create } from "@bufbuild/protobuf";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AddItemBlockRulesRequestSchema,
  AddItemBlockRulesResponseSchema,
  ListURLParsingRulesResponseSchema,
  URLParsingRuleSchema,
} from "../../gen/item/v1/item_pb";
import { addItemBlockRules, listURLParsingRules } from "./block-rules";
import { itemClient } from "./client";

// Mock the client
vi.mock("./client", () => ({
  itemClient: {
    listURLParsingRules: vi.fn(),
    addItemBlockRules: vi.fn(),
  },
}));

describe("block-rules api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listURLParsingRules", () => {
    it("should call itemClient.listURLParsingRules", async () => {
      const mockRulesData = [{ domain: "example.com", ruleType: "domain" }];
      const mockRules = mockRulesData.map((r) =>
        create(URLParsingRuleSchema, r),
      );
      vi.mocked(itemClient.listURLParsingRules).mockResolvedValue(
        create(ListURLParsingRulesResponseSchema, {
          rules: mockRules,
        }),
      );

      const result = await listURLParsingRules();

      expect(itemClient.listURLParsingRules).toHaveBeenCalledWith({});
      // Compare only the data fields we care about
      expect(result.length).toBe(mockRules.length);
      expect(result[0].domain).toBe(mockRules[0].domain);
      expect(result[0].ruleType).toBe(mockRules[0].ruleType);
    });
  });

  describe("addItemBlockRules", () => {
    it("should call itemClient.addItemBlockRules with correct parameters", async () => {
      const mockRequest = create(AddItemBlockRulesRequestSchema, {
        rules: [{ ruleType: "domain", value: "example.com" }],
      });
      vi.mocked(itemClient.addItemBlockRules).mockResolvedValue(
        create(AddItemBlockRulesResponseSchema, {}),
      );

      await addItemBlockRules(mockRequest);

      expect(itemClient.addItemBlockRules).toHaveBeenCalledWith(mockRequest);
    });
  });
});
