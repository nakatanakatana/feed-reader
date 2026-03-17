import { fromJson, type JsonValue, toJson } from "@bufbuild/protobuf";
import type { GenMessage, GenService } from "@bufbuild/protobuf/codegenv2";
import { type HttpHandler, HttpResponse, http } from "msw";

type InferMessage<T> = T extends GenMessage<infer M> ? M : never;

// Define a type that matches the structure of methods in GenService
// GenServiceMethods values usually have methodKind, input, output.
type MethodDef = {
  input: GenMessage<any>;
  output: GenMessage<any>;
  methodKind: "unary" | "server_streaming" | "client_streaming" | "bidi_streaming";
};

export const parseConnectMessage = async (request: Request): Promise<JsonValue> => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const messageParam = url.searchParams.get("message");

    if (!messageParam) {
      return {};
    }
    try {
      const decoded = atob(messageParam.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded) as JsonValue;
    } catch {
      return JSON.parse(decodeURIComponent(messageParam)) as JsonValue;
    }
  }
  return (await request.json()) as JsonValue;
};

/**
 * Robust JSON serialization that handles BigInt and Date by converting them to strings.
 */
export const safeJson = (data: unknown): HttpResponse<any> => {
  const replacer = (_key: string, value: unknown): unknown => {
    if (typeof value === "bigint") return value.toString();
    return value;
  };

  // Pre-process Date objects because JSON.stringify calls .toJSON() before the replacer.
  const processDates = (obj: unknown): unknown => {
    if (obj instanceof Date) {
      if (Number.isNaN(obj.getTime())) {
        console.warn("safeJson encountered an Invalid Date");
        return null;
      }
      return obj.toISOString();
    }
    if (Array.isArray(obj)) {
      return obj.map(processDates);
    }
    if (obj !== null && typeof obj === "object") {
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, processDates(v)]));
    }
    return obj;
  };

  const body = JSON.stringify(processDates(data), replacer);
  return new HttpResponse(body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const mockConnectWeb =
  <T extends Record<string, MethodDef>>(service: GenService<T>) =>
  <U extends keyof T & string>(props: {
    method: U;
    handler: (req: InferMessage<T[U]["input"]>) => InferMessage<T[U]["output"]>;
  }): HttpHandler => {
    // Connect/gRPC conventions: Service/Method (PascalCase)
    const rpcName = props.method.charAt(0).toUpperCase() + props.method.slice(1);

    return http.all(`*/${service.typeName}/${rpcName}`, async ({ request }) => {
      const methods = service.methods as any;
      let methodDef: MethodDef | undefined;
      if (Array.isArray(methods)) {
        methodDef = methods.find((m: any) => m.localName === props.method);
      } else {
        methodDef = methods[props.method];
      }

      if (!methodDef) {
        throw new Error(`Method ${props.method} not found in service ${service.typeName}`);
      }

      let jsonBody: JsonValue;
      try {
        jsonBody = await parseConnectMessage(request);
      } catch (_e) {
        return new HttpResponse(null, { status: 400 });
      }

      // Decode the JSON request into a typed Message
      const req = fromJson(methodDef.input, jsonBody);

      // Call the mock handler
      const resp = props.handler(req);

      // Encode the response Message back to JSON
      const respJson = toJson(methodDef.output, resp);
      return safeJson(respJson);
    });
  };
