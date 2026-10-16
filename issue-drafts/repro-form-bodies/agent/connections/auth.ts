import { defineOpenAPIConnection } from "eve/connections";

// OpenAPI 3: a token endpoint whose only request body type is form-encoded.
export default defineOpenAPIConnection({
  description: "Issues tokens from the local echo server.",
  baseUrl: "http://localhost:4010",
  spec: {
    openapi: "3.0.0",
    info: { title: "Auth", version: "1.0.0" },
    paths: {
      "/token": {
        post: {
          operationId: "token",
          requestBody: {
            required: true,
            content: {
              "application/x-www-form-urlencoded": {
                schema: { type: "object", properties: { grant_type: { type: "string" } } },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
    },
  },
});
