import { fromJson, toJson, type JsonValue } from "@bufbuild/protobuf";
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

export const mockConnectWeb =
  <T extends Record<string, MethodDef>>(service: GenService<T>) =>
  <U extends keyof T & string>(props: {
    method: U;
    handler: (
      req: InferMessage<T[U]["input"]>,
    ) => InferMessage<T[U]["output"]>;
  }): HttpHandler => {
    // Connect/gRPC conventions: Service/Method (PascalCase)
    const rpcName = props.method.charAt(0).toUpperCase() + props.method.slice(1);

    return http.all(
      `*/${service.typeName}/${rpcName}`,
      async ({ request }) => {
        const methods = service.methods as unknown as T;
        const methodDef = methods[props.method];
        
        // Cast to any/JsonValue because msw request.json() might return unknown/DefaultBodyType
        // and fromJson expects JsonValue.
        const jsonBody = (await request.json()) as JsonValue;
        
        // Decode the JSON request into a typed Message
        const req = fromJson(methodDef.input, jsonBody);

        // Call the mock handler
        const resp = props.handler(req);

        // Encode the response Message back to JSON
        const respJson = toJson(methodDef.output, resp);
        return HttpResponse.json(respJson);
      },
    );
  };
