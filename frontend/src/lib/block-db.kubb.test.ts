import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { worker } from "../mocks/browser";

describe("block-db kubb query options", () => {
  afterEach(() => {
    worker.resetHandlers();
  });

  it("urlParsingRulesQueryOptions.queryFn returns mapped url rules", async () => {
    worker.use(
      http.get("*/api/v2/url-rules", () =>
        HttpResponse.json({
          rules: [
            {
              id: "url-1",
              domain: "example.com",
              ruleType: "path",
              pattern: "/news",
            },
          ],
        }),
      ),
    );

    const { urlParsingRulesQueryOptions } = await import("./block-db");
    const result = await urlParsingRulesQueryOptions.queryFn();

    expect(result).toEqual([
      {
        id: "url-1",
        domain: "example.com",
        ruleType: "path",
        pattern: "/news",
      },
    ]);
  });

  it("itemBlockRulesQueryOptions.queryFn returns mapped block rules", async () => {
    worker.use(
      http.get("*/api/v2/block-rules", () =>
        HttpResponse.json({
          rules: [
            {
              id: "block-1",
              ruleType: "keyword",
              value: "spoiler",
              domain: "example.com",
            },
          ],
        }),
      ),
    );

    const { itemBlockRulesQueryOptions } = await import("./block-db");
    const result = await itemBlockRulesQueryOptions.queryFn();

    expect(result).toEqual([
      {
        id: "block-1",
        ruleType: "keyword",
        value: "spoiler",
        domain: "example.com",
      },
    ]);
  });
});
