# eve reproduction: OpenAPI form bodies are sent as JSON; Swagger 2.0 formData is dropped

Minimal reproduction created with `npx eve@latest init` (eve 0.80.0). It needs no
model API key: `agent/agent.ts` uses eve's `mockModel` to script the tool calls.

Only four files differ from the scaffold:

- `agent/connections/auth.ts`: OpenAPI 3. `POST /token` accepts only
  `application/x-www-form-urlencoded`.
- `agent/connections/legacy.ts`: Swagger 2.0. `POST /login` takes a required
  `user` parameter `in: formData`.
- `agent/agent.ts`: a scripted model. It calls `auth__token` with
  `{ "body": { "grant_type": "client_credentials" } }`, then searches for
  `legacy__login` to show its generated input signature.
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
[echo-server] POST /token
[echo-server]   content-type: application/x-www-form-urlencoded
[echo-server]   body: {"grant_type":"client_credentials"}
```

Expected body: `grant_type=client_credentials`.

The agent's reply shows the Swagger 2.0 tool signature as
`legacy__login(input: Record<string, unknown>)`, with no `user` field. Expected:
`user` is exposed as a required string input and sent form-encoded.
