# Bug form fields

Each section below maps to the fields of the vercel/eve bug report form. The form also requires a
public reproduction repo link; see "Reproduction link" at the end.

---

## 1. OpenAPI: operation-level parameters don't override path-level ones

**Title:** OpenAPI connections: operation-level parameters don't override path-level ones (sent twice, duplicate `required`)

**Steps to reproduce**

1. Add `agent/connections/items.ts`:
   ```ts
   import { defineOpenAPIConnection } from "eve/connections";

   export default defineOpenAPIConnection({
     baseUrl: "https://api.example.com",
     spec: {
       openapi: "3.0.0",
       paths: {
         "/items": {
           parameters: [
             { name: "limit", in: "query", required: true, schema: { type: "integer" } },
           ],
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
             responses: { "200": { description: "OK" } },
           },
         },
       },
     },
   });
   ```
2. Run `eve dev` and ask the agent to list items with a limit of 10, so it calls the `list` tool with `{ "limit": 10 }`.
3. Inspect the outgoing request and the tool's input schema.

**Current vs. expected behavior**

Current:

- The request goes to `https://api.example.com/items?limit=10&limit=10`.
- The tool input schema has `"required": ["limit", "limit"]`.

Expected:

- The request goes to `https://api.example.com/items?limit=10`.
- The schema has `"required": ["limit"]`.

The OpenAPI spec says operation-level parameters override path-level ones with the same `name` + `in`. The cause is `packages/eve/src/runtime/connections/openapi-client.ts`, which concatenates the two lists (`[...sharedParams, ...opParams]`) without merging. Suggested fix: merge by `${in}:${name}` after `$ref` resolution, with the operation-level entry winning.

---

## 2. OpenAPI: an empty path parameter changes the route

**Title:** OpenAPI connections: an empty path parameter is accepted and changes the request route

**Steps to reproduce**

1. `npm install` (Node.js 24)
2. `node echo-server.mjs` in one terminal
3. `npx eve dev --no-ui` in another
4. `curl -s -X POST http://127.0.0.1:2000/eve/v1/session -H 'content-type: application/json' -d '{"message":"Go."}'`
5. The scripted model calls `items__deleteItem` with `{ "id": "" }`; the echo server prints the request eve sent.

**Current vs. expected behavior**

Current: the echo server prints `DELETE /items/`. The empty `id` passes the tool's input schema and is substituted as-is, so a single-item delete is sent to the collection route.

Expected: eve rejects the empty value before sending the request, as it already does for `.` and `..` since #4931. (A missing `id` is correctly rejected by schema validation; only `""` slips through.)

Cause: in `openapi-client.ts` `executeTool`, the path branch only checks for `.` and `..`.

---

## 3. OpenAPI: form bodies sent as JSON; Swagger 2.0 `formData` dropped

**Title:** OpenAPI connections: form-encoded request bodies are sent as JSON, and Swagger 2.0 `formData` parameters are dropped

**Steps to reproduce**

1. Add an OpenAPI connection with a `POST /token` operation whose only `requestBody` content type is `application/x-www-form-urlencoded`, with schema `{ type: "object", properties: { grant_type: { type: "string" } } }`.
2. Call the tool with `{ "body": { "grant_type": "client_credentials" } }` and inspect the request.
3. Separately, add a Swagger 2.0 connection with `POST /login`, `consumes: ["application/x-www-form-urlencoded"]`, and parameter `{ name: "user", in: "formData", type: "string", required: true }`. Inspect the generated `login` tool's input schema.

**Current vs. expected behavior**

Current:

- Step 2 sends `content-type: application/x-www-form-urlencoded` with the JSON body `{"grant_type":"client_credentials"}`. A form-parsing server sees no `grant_type`.
- Step 3's tool has an empty input schema (`{"type":"object","properties":{}}`), so the model can never send `user`.

Expected:

- Step 2 sends `grant_type=client_credentials`.
- Step 3's tool exposes `user` as a required input and sends it form-encoded.
- Content types eve can't encode are skipped or produce a clear error, rather than sending JSON under a mismatched header.

Cause, in `openapi-client.ts`:

- `executeTool` always uses `JSON.stringify(body)`, whatever the chosen content type.
- `#resolveParameters` ignores `in: "formData"`.

---

## 4. Docs/code mismatches (consider the docs template, if there is one)

**Title:** Docs: four places where the docs disagree with the code (CLI default, subagent and skill examples, skill name rule)

**Steps to reproduce**

1. Run `eve dev` with no `--reasoning` flag. `docs/reference/cli.md:274` says the default is `full`.
2. Copy the "Conditional availability" example from `docs/subagents/index.mdx:128` (`attributes.research === true`) and send a JWT with `"research": true`.
3. Paste the "Dynamic skills" example from `docs/guides/dynamic-capabilities.md` (`defineSkill({ markdown })`) into `agent/skills/team_playbook.ts` and run `pnpm typecheck`.
4. Compare the skill name rule in `docs/guides/dynamic-capabilities.md` ("start with a letter") with `docs/skills.mdx` ("start with a letter or digit").

**Current vs. expected behavior**

1. **Reasoning default.** Reasoning shows collapsed: the code default is `auto-collapsed` (`packages/eve/src/cli/dev/ui-options.ts:37`). Fix the docs default.
2. **Subagent example.** The subagent is never offered. Auth attributes are only strings or string arrays (`channel/types.ts:143`), and boolean JWT claims are dropped (`channel/auth/token-claims.ts`), so `=== true` never matches. The example should compare against `"true"`.
3. **Dynamic skills example.**
   - It omits the required `description` (`shared/skill-definition.ts:18`).
   - It indexes with a value that may be a `readonly string[]`.
   - `docs/tutorial/team-playbooks.mdx` already shows the correct version.
4. **Skill name rule.** The code allows a leading digit for both static and dynamic skills (`SKILL_NAME_PATTERN` in `discover/grammar.ts`). The guide should say "letter or digit".

All four are docs-only fixes.

---

## 5. `eve set model` error names a nonexistent flag

**Title:** `eve set model` with no arguments tells you to pass a `--model` flag that doesn't exist

**Steps to reproduce**

1. In any eve project, run `eve set model` with no arguments.
2. Follow the message's advice: `eve set model --model openai/gpt-6-sol`.

**Current vs. expected behavior**

Current:

- Step 1 prints `Pass --model, --reasoning, or both.` and exits 1.
- Step 2 fails with commander's unknown-option error, because the model is a positional argument (`eve set model [model] [--reasoning <effort>]`).

Expected: the message names the real syntax, e.g. `Pass a model, --reasoning, or both. Example: eve set model openai/gpt-6-sol --reasoning high`.

Source: `packages/eve/src/cli/commands/set.ts:42`; the test in `set.test.ts` asserts the old string.

---

## Reproduction link

The form requires a public GitHub repo created with `npx eve@latest init`, containing only the
changes that trigger the bug. Issues 1–3 and 5 need a real one. For issue 4, the docs file and
line references are the reproduction.
