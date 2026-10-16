**Title:** OpenAPI connections: operation-level parameters don't override path-level ones (sent twice, duplicate `required`)

## Bug

When an OpenAPI path item declares a parameter in `paths.<path>.parameters` and an operation redeclares the same parameter (same `name` + `in`), eve keeps both instead of letting the operation-level definition override the path-level one.

The OpenAPI spec says path-level parameters "can be overridden at the operation level, but cannot be removed there", and a parameter is uniquely identified by `name` + `in`. Redeclaring a shared parameter per operation to tighten it (e.g. a lower `maximum`, a different description) is common in real-world specs.

## Reproduction

```ts
// agent/connections/items.ts
import { defineOpenAPIConnection } from "eve/connections";

export default defineOpenAPIConnection({
  baseUrl: "https://api.example.com",
  spec: {
    openapi: "3.0.0",
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
        },
      },
    },
  },
});
```

Calling the `list` tool with `{ "limit": 10 }`:

|                              | Actual                                            | Expected                                 |
| ---------------------------- | ------------------------------------------------- | ---------------------------------------- |
| Request URL                  | `https://api.example.com/items?limit=10&limit=10` | `https://api.example.com/items?limit=10` |
| Tool input schema `required` | `["limit", "limit"]`                              | `["limit"]`                              |

Many servers treat a repeated query key as an array and reject the request or read the wrong value, and a `required` array with duplicates is invalid JSON Schema (items must be unique), so strict schema validators can reject the tool. Repeated cookie parameters are also sent twice.

(Verified against `main` at 0857ff4 with a vitest harness that calls `OpenApiConnectionClient` directly with `fetch` stubbed.)

## Cause

`packages/eve/src/runtime/connections/openapi-client.ts` concatenates the two lists without de-duplicating:

```ts
const rawParameters = [...sharedParams, ...opParams];
```

Every entry is then emitted into the input schema and applied to the request.

## Suggested fix

Merge by `${in}:${name}` after resolving `$ref`s, inserting path-level parameters first so operation-level ones replace them:

```ts
const merged = new Map<string, ResolvedParameter>();
for (const param of [...resolve(sharedParams), ...resolve(opParams)]) {
  merged.set(`${param.location}:${param.name}`, param);
}
```

(Keying must happen after `$ref` resolution, since either list may reference `#/components/parameters/...`.)

## Validation

- Unit test in `openapi-client.test.ts`: a path-level + operation-level parameter with the same `name`/`in` produces one schema property (the operation's definition), a single `required` entry, and a single query key on the request.
- Unit test that same-name parameters in _different_ locations (e.g. `id` in path and `id` in query) are both kept.
