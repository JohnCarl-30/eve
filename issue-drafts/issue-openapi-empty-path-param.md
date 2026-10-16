**Title:** OpenAPI connections: empty or missing path parameters silently change the request route

## Bug

eve's OpenAPI client substitutes path parameter values into `{name}` placeholders, but two cases slip through and still send a request:

1. **Empty string.** `""` is substituted as-is, collapsing the segment. `DELETE /items/{id}` with `{ "id": "" }` is sent to `/items/`, which on most APIs is a different (collection) endpoint.
2. **Missing value.** If the value is `undefined` or `null`, the parameter is skipped and the literal placeholder is sent, URL-encoded: `/items/%7Bid%7D`. The model can omit it, or a `toolCall.providedArguments` resolver can return `undefined`.

This is the same kind of route change that #4931 fixed for `.` and `..`. The docs promise that eve substitutes `in: "path"` values into the matching placeholder (`docs/connections/openapi.mdx`, "Path parameters"), and OpenAPI path parameters are always required. Neither case should reach the network.

## Reproduction

```ts
// agent/connections/items.ts
import { defineOpenAPIConnection } from "eve/connections";

export default defineOpenAPIConnection({
  baseUrl: "https://api.example.com",
  spec: {
    openapi: "3.0.0",
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

| Tool input     | Request URL actually sent                       | Expected                    |
| -------------- | ----------------------------------------------- | --------------------------- |
| `{ "id": "" }` | `DELETE https://api.example.com/items/`         | rejected before the request |
| `{}`           | `DELETE https://api.example.com/items/%7Bid%7D` | rejected before the request |

(Verified on `main` at 0857ff4 with a vitest harness that calls `OpenApiConnectionClient.executeTool` directly with `fetch` stubbed.)

The empty-string case is the more dangerous one. A destructive operation on a single resource can end up hitting the collection route instead.

## Cause

`packages/eve/src/runtime/connections/openapi-client.ts`, in the parameter loop of `executeTool`:

```ts
const value = resolvedArgs[param.name];
if (value === undefined || value === null) {
  continue;                     // path placeholder left in the template
}
if (param.location === "path") {
  const pathValue = String(value);
  if (pathValue === "." || pathValue === "..") { throw ... }
  path = path.replace(`{${param.name}}`, encodeURIComponent(pathValue));  // "" accepted
}
```

## Suggested fix

- In the path branch, reject `""` alongside `.` and `..`, reusing the same error format that names the parameter, tool and connection.
- For `path` parameters, treat `undefined`/`null` as an error instead of `continue`. Alternatively, after the loop, throw if the path still contains an unsubstituted `{...}` placeholder for a declared path parameter.
- Update the "Path parameters" section of `docs/connections/openapi.mdx` to say empty and missing values are rejected too.

## Validation

Unit tests in `openapi-client.test.ts`:

- An empty-string path value throws, and `fetch` is not called.
- A missing path value throws, and `fetch` is not called, including when the value comes from `providedArguments`.
- Existing behavior is kept: values with embedded slashes are still URL-encoded and accepted.
