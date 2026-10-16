import { defineOpenAPIConnection } from "eve/connections";

// A single-item DELETE route. `id` is a required path parameter.
export default defineOpenAPIConnection({
  description: "Deletes items on the local echo server.",
  baseUrl: "http://localhost:4010",
  spec: {
    openapi: "3.0.0",
    info: { title: "Items", version: "1.0.0" },
    paths: {
      "/items/{id}": {
        delete: {
          operationId: "deleteItem",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "OK" } },
        },
      },
    },
  },
});
