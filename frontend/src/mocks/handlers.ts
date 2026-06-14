import { handlers as generatedHandlers } from "./generated/handlers";
import { resetState, statefulHandlers } from "./handlers.stateful";

type RouteAwareHandler = {
  info?: {
    method?: string;
    path?: string;
  };
};

const toRouteKey = (handler: RouteAwareHandler): string | null => {
  if (!handler.info?.method || !handler.info.path) return null;
  return `${handler.info.method.toUpperCase()} ${handler.info.path}`;
};

const statefulRouteKeys = new Set(
  statefulHandlers
    .map((handler) => toRouteKey(handler as RouteAwareHandler))
    .filter((key): key is string => key !== null),
);

const fallbackHandlers = generatedHandlers.filter((handler) => {
  const key = toRouteKey(handler as RouteAwareHandler);
  return key === null || !statefulRouteKeys.has(key);
});

export { resetState };

export const handlers = [...statefulHandlers, ...fallbackHandlers];
