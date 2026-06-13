import { HttpResponse } from "msw";

export const parseRequestMessage = async (
  request: Request,
): Promise<Record<string, unknown>> => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const messageParam = url.searchParams.get("message");
    if (!messageParam) {
      const params: Record<string, unknown> = Object.fromEntries(
        url.searchParams.entries(),
      );
      const itemMatch = url.pathname.match(/\/api\/v2\/items\/([^/]+)$/);
      if (itemMatch) params.id = decodeURIComponent(itemMatch[1]);
      if (params.isRead === "true") params.isRead = true;
      if (params.isRead === "false") params.isRead = false;
      return params;
    }
    try {
      const decoded = atob(messageParam.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return JSON.parse(decodeURIComponent(messageParam)) as Record<
        string,
        unknown
      >;
    }
  }
  return (await request.json()) as Record<string, unknown>;
};

export const safeJson = (data: unknown): HttpResponse<string> => {
  const replacer = (_key: string, value: unknown): unknown => {
    if (typeof value === "bigint") return value.toString();
    return value;
  };

  const processDates = (obj: unknown): unknown => {
    if (obj instanceof Date) {
      return Number.isNaN(obj.getTime()) ? null : obj.toISOString();
    }
    if (Array.isArray(obj)) return obj.map(processDates);
    if (obj !== null && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, processDates(value)]),
      );
    }
    return obj;
  };

  return new HttpResponse(JSON.stringify(processDates(data), replacer), {
    headers: { "Content-Type": "application/json" },
  });
};
