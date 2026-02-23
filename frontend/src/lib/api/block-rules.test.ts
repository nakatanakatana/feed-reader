import { create } from "@bufbuild/protobuf";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddItemBlockRulesRequestSchema } from "../../gen/item/v1/item_pb";
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
      const mockRules = [{ domain: "example.com", ruleType: "domain" }];
      (itemClient.listURLParsingRules as any).mockResolvedValue({
        rules: mockRules,
      });

      const result = await listURLParsingRules();

      expect(itemClient.listURLParsingRules).toHaveBeenCalledWith({});
      expect(result).toEqual(mockRules);
    });
  });

  describe("addItemBlockRules", () => {
    it("should call itemClient.addItemBlockRules with correct parameters", async () => {
      const mockRequest = create(AddItemBlockRulesRequestSchema, {
        rules: [{ ruleType: "domain", value: "example.com" }],
      });
      (itemClient.addItemBlockRules as any).mockResolvedValue({});

      await addItemBlockRules(mockRequest);

      expect(itemClient.addItemBlockRules).toHaveBeenCalledWith(mockRequest);
    });
  });
});
