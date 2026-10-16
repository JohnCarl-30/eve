**Title:** OpenAPI connections: an empty path parameter is accepted and changes the request route

## Bug

eve's OpenAPI client substitutes path parameter values into `{name}` placeholders. It already rejects `.` and `..` because they would change the route (#4931). An empty string slips through: it passes the generated tool's input schema (`{ id: string }`) and is substituted as-is, collapsing the segment.

`DELETE /items/{id}` called with `{ "id": "" }` is sent to `DELETE /items/`, which on most APIs is the collection route. A destructive single-resource operation ends up hitting a different endpoint.

## Reproduction

Minimal reproduction: `issue-drafts/repro-empty-path-param` (eve 0.80.0, scripted `mockModel`, no API key needed).

```ts
// agent/connections/items.ts
import { defineOpenAPIConnection } from "eve/connections";

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
```

Calling `items__deleteItem` with `{ "id": "" }` makes the local echo server print:

```
[echo-server] DELETE /items/
```

Expected: eve rejects the empty value before sending the request, with the same kind of error it gives for `.` and `..`.

(Calling with `{}` is correctly rejected by input-schema validation, so the problem is specific to the empty string.)

## Cause

`packages/eve/src/runtime/connections/openapi-client.ts`, in the parameter loop of `executeTool`:

```ts
if (param.location === "path") {
  const pathValue = String(value);
  if (pathValue === "." || pathValue === "..") { throw ... }
  path = path.replace(`{${param.name}}`, encodeURIComponent(pathValue));  // "" accepted
}
```

## Suggested fix

- Reject `""` alongside `.` and `..` in the path branch, reusing the existing error format that names the parameter, tool and connection.
- Update the "Path parameters" section of `docs/connections/openapi.mdx` to mention empty values.

## Validation

- Unit test in `openapi-client.test.ts`: an empty-string path value throws, and `fetch` is not called.
- Values with embedded slashes are still URL-encoded and accepted (no regression).
