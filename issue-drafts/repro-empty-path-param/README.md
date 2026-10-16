# eve reproduction: an empty OpenAPI path parameter changes the request route

Minimal reproduction created with `npx eve@latest init` (eve 0.80.0). It needs no
model API key: `agent/agent.ts` uses eve's `mockModel` to script the tool call.

Only three files differ from the scaffold:

- `agent/connections/items.ts`: an OpenAPI connection with `DELETE /items/{id}`.
- `agent/agent.ts`: a scripted model that calls `items__deleteItem` with `{ "id": "" }`.
- `echo-server.mjs`: a local HTTP server that prints each request eve sends.

## Steps

Requires Node.js 24.

```sh
npm install
node echo-server.mjs          # terminal 1
npx eve dev --no-ui           # terminal 2; note the printed URL, e.g. http://127.0.0.1:2000
curl -s -X POST http://127.0.0.1:2000/eve/v1/session \
  -H 'content-type: application/json' -d '{"message":"Go."}'
```

## Result

The echo server prints:

```
[echo-server] DELETE /items/
```

Expected: eve rejects the empty value before sending the request, as it already
does for `.` and `..`. Instead, the single-item `DELETE /items/{id}` is sent to
the collection route `/items/`.
