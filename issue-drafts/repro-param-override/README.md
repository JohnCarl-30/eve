# eve reproduction: OpenAPI operation-level parameters don't override path-level ones

Minimal reproduction created with `npx eve@latest init` (eve 0.80.0). It needs no
model API key: `agent/agent.ts` uses eve's `mockModel` to script the tool calls.

Only three files differ from the scaffold:

- `agent/connections/items.ts`: an OpenAPI connection. `limit` is declared at the
  path level and redeclared on the `list` operation.
- `agent/agent.ts`: a scripted model. It finds `items__list` with `eve__search`,
  then calls it with `{ "limit": 10 }`.
- `echo-server.mjs`: a local HTTP server that prints each request URL eve sends.

## Steps

Requires Node.js 24.

```sh
npm install
node echo-server.mjs          # terminal 1
npx eve dev --no-ui           # terminal 2; note the printed URL, e.g. http://127.0.0.1:2000
curl -s -X POST http://127.0.0.1:2000/eve/v1/session \
  -H 'content-type: application/json' -d '{"message":"List 10 items."}'
```

## Result

The echo server prints:

```
[echo-server] GET /items?limit=10&limit=10
```

Expected: `GET /items?limit=10`. The OpenAPI spec says an operation-level
parameter overrides a path-level parameter with the same `name` and `in`; eve
sends both. The generated tool's input schema also lists `limit` twice in
`required`.
