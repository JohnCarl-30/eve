import { defineOpenAPIConnection } from "eve/connections";

// `limit` is declared at the path level and redeclared on the operation.
// Per the OpenAPI spec, the operation-level definition should override it.
export default defineOpenAPIConnection({
  description: "Lists items from the local echo server.",
  baseUrl: "http://localhost:4010",
  spec: {
    openapi: "3.0.0",
    info: { title: "Items", version: "1.0.0" },
    paths: {
      "/items": {
        parameters: [{ name: "limit", in: "query", required: true, schema: { type: "integer" } }],
        get: {
          operationId: "list",
          parameters: [
            {
              name: "limit",
              in: "query",
              required: true,
              schema: { type: "integer", maximum: 50 },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
    },
  },
});
