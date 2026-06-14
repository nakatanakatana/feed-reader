import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginMsw } from "@kubb/plugin-msw";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginSolidQuery } from "@kubb/plugin-solid-query";
import { pluginTs } from "@kubb/plugin-ts";

export default defineConfig({
  root: ".",
  input: {
    path: "./api/openapi.yaml",
  },
  output: {
    path: "./frontend/src/lib/api",
    clean: false,
    barrelType: false,
  },
  plugins: [
    // plugin-ts depends on plugin-oas for OAS parsing; skip JSON schema file output.
    pluginOas({
      generators: [],
      output: {
        path: "./schemas",
        barrelType: false,
      },
    }),
    pluginTs({
      output: {
        path: "./types-generated.ts",
        barrelType: false,
      },
    }),
    pluginClient({
      output: { path: "./generated/client", barrelType: false },
      importPath: "../../kubb-client.ts",
      baseURL: "/api/v2",
    }),
    pluginSolidQuery({
      output: { path: "./generated/queries", barrelType: false },
      client: { importPath: "../../kubb-client.ts" },
      query: { methods: ["get"], importPath: "@tanstack/solid-query" },
      mutation: {
        methods: ["post", "delete"],
        importPath: "@tanstack/solid-query",
      },
    }),
    pluginMsw({
      output: { path: "../../mocks/generated", barrelType: false },
      handlers: true,
      baseURL: "*/api/v2",
      parser: "data",
    }),
  ],
});
