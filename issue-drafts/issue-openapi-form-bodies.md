**Title:** OpenAPI connections: form-encoded request bodies are sent as JSON, and Swagger 2.0 `formData` parameters are dropped

## Bug

eve's OpenAPI client always serializes request bodies with `JSON.stringify`, even when the operation only accepts a form content type. It then labels that JSON with the form `content-type`. Swagger 2.0 `in: "formData"` parameters are ignored entirely. As a result, operations that take form input can't be called correctly. OAuth token endpoints, login endpoints and many older APIs commonly declare `application/x-www-form-urlencoded` as their only body type.

## Reproduction

**OpenAPI 3.x: urlencoded body**

```ts
spec: {
  openapi: "3.0.0",
  paths: {
    "/token": {
      post: {
        operationId: "token",
        requestBody: {
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
}
```

Calling `token` with `{ "body": { "grant_type": "client_credentials" } }` sends:

```
content-type: application/x-www-form-urlencoded

{"grant_type":"client_credentials"}
```

Expected body: `grant_type=client_credentials`. A form-parsing server sees one malformed key and no `grant_type`.

**Swagger 2.0: `formData` parameters**

```ts
spec: {
  swagger: "2.0",
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
}
```

The generated `login` tool has an empty input schema (`{"type":"object","properties":{}}`), so the model can never send `user`. The docs say Swagger 2.0 documents are supported (`docs/connections/openapi.mdx`).

(Both verified on `main` at 0857ff4 with a vitest harness that calls `OpenApiConnectionClient` directly with `fetch` stubbed.)

## Cause

All in `packages/eve/src/runtime/connections/openapi-client.ts`:

- `#resolveRequestBody` picks `application/json` if present, otherwise the first declared content type, whatever it is.
- `executeTool` always does `body = JSON.stringify(resolvedArgs.body)` and sets `content-type` to that chosen type.
- `#resolveParameters` keeps only `path`, `query`, `header` and `cookie` locations. `formData` is silently skipped, and only `in: "body"` is handled for Swagger bodies.

## Suggested fix

The smallest correct change:

1. **Encode by content type.** For `application/x-www-form-urlencoded`, serialize a flat object body with `URLSearchParams`. Keep `JSON.stringify` for JSON and `+json` types.
2. **Refuse what can't be encoded.** If an operation declares only content types eve can't encode (e.g. `multipart/form-data`, `application/xml`), skip the operation or fail with a clear error naming it. Don't send JSON under a mismatched header.
3. **Map Swagger 2.0 `formData`.** Collect `in: "formData"` parameters into an object `body` schema, required fields included, and send it with the operation's `consumes` type (urlencoded by default).
4. **Docs.** List which body content types are supported in `docs/connections/openapi.mdx`.

Multipart (file upload) support could be a separate follow-up. The point here is that eve should never send a body that disagrees with its own `content-type` header.

## Validation

Unit tests in `openapi-client.test.ts`:

- A urlencoded-only `requestBody` sends `grant_type=client_credentials` with the urlencoded `content-type`.
- A JSON body and a vendor `+json` type are still sent as JSON (no regression).
- Swagger 2.0 `formData` parameters appear in the tool input schema, with `required` preserved, and are sent form-encoded.
- An operation declaring only an unsupported content type is skipped or errors clearly instead of sending JSON.
