import { describe, expect, it } from "vitest";
import { handlers as generatedHandlers } from "./generated/handlers";
import { handlers, resetState } from "./handlers";
import { statefulHandlers } from "./handlers.stateful";

type HandlerLike = {
  info?: {
    method?: string;
    path?: string;
  };
};

const toRouteKey = (handler: HandlerLike): string | null => {
  if (!handler.info?.method || !handler.info.path) return null;
  return `${handler.info.method.toUpperCase()} ${handler.info.path}`;
};

describe("handler composition", () => {
  it("prioritizes stateful handlers", () => {
    expect(handlers.slice(0, statefulHandlers.length)).toEqual(
      statefulHandlers,
    );
  });

  it("deduplicates overlapping routes from generated handlers", () => {
    const keys = handlers
      .map((handler) => toRouteKey(handler as HandlerLike))
      .filter((key): key is string => key !== null);
    expect(new Set(keys).size).toBe(keys.length);

    const statefulKeys = new Set(
      statefulHandlers
        .map((handler) => toRouteKey(handler as HandlerLike))
        .filter((key): key is string => key !== null),
    );
    const generatedKeys = new Set(
      generatedHandlers
        .map((handler) => toRouteKey(handler as HandlerLike))
        .filter((key): key is string => key !== null),
    );

    expect(
      [...statefulKeys].some((key) => generatedKeys.has(key)),
    ).toBeTruthy();
  });

  it("re-exports resetState", () => {
    expect(() => resetState()).not.toThrow();
  });
});
