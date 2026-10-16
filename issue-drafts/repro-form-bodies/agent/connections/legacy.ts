import { defineOpenAPIConnection } from "eve/connections";

// Swagger 2.0: a login endpoint that takes a `formData` parameter.
export default defineOpenAPIConnection({
  description: "Logs in to the local echo server.",
  baseUrl: "http://localhost:4010",
  spec: {
    swagger: "2.0",
    info: { title: "Legacy", version: "1.0.0" },
    paths: {
      "/login": {
        post: {
          operationId: "login",
          consumes: ["application/x-www-form-urlencoded"],
          parameters: [{ name: "user", in: "formData", type: "string", required: true }],
          responses: { "200": { description: "OK" } },
        },
      },
    },
  },
});
