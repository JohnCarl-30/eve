**Title:** Docs: four places where the docs disagree with the code (CLI default, subagent and skill examples, skill name rule)

## Summary

While reading the docs alongside the source, I found four spots where following the docs gives the wrong result. All four fixes are docs-only; the code behaves as intended in each case. Checked against `main` at 0857ff4.

## 1. `eve dev --reasoning` default is documented as `full`, but is `auto-collapsed`

- **Docs:** `docs/reference/cli.md:274` lists the default for `--reasoning <mode>` as `full`.
- **Code:** `packages/eve/src/cli/dev/ui-options.ts:37` uses `options.reasoning ?? "auto-collapsed"`. The comment there says collapsed is deliberate and `--reasoning full` restores the streaming trace, and `run.test.ts` asserts `auto-collapsed`.
- **What you see:** running `eve dev` with no flag shows the collapsed thinking line, not the full trace the docs describe.
- **Fix:** change the default cell to `` `auto-collapsed` ``, matching the `--tools` row above it.

## 2. Conditional subagent example compares an auth attribute to a boolean, so it never matches

- **Docs:** `docs/subagents/index.mdx:128` gates the subagent on:
  ```ts
  ctx.session.auth.current?.attributes.research === true;
  ```
- **Code:** auth attributes are typed `Readonly<Record<string, string | readonly string[]>>` (`packages/eve/src/channel/types.ts:143`). At runtime, JWT claims are normalized to keep only string and string-array values, so a boolean `"research": true` claim is dropped (`packages/eve/src/channel/auth/token-claims.ts`, `normalizeJwtClaims`).
- **What you see:** the comparison is never true, so the resolver always returns `null` and the `researcher` subagent is never offered, even for a token carrying `"research": true`.
- **Fix:** compare against a string, e.g. `attributes.research === "true"`, and mention that attributes are always strings or string arrays. Other examples already use this style (`plan === "enterprise"`).

## 3. Dynamic skills example omits the required `description`

- **Docs:** `docs/guides/dynamic-capabilities.md`, "Dynamic skills":
  ```ts
  const team = ctx.session.auth.current?.attributes.team;
  const markdown = team ? PLAYBOOKS[team] : undefined;
  return markdown ? defineSkill({ markdown }) : null;
  ```
- **Code:** `description` is a required field of skill definitions (`packages/eve/src/shared/skill-definition.ts:18`). The skill list shown to the model renders `- ${name}: ${description}` (`packages/eve/src/execution/skills/instructions.ts`).
- **What you see:**
  - The example doesn't satisfy `defineSkill`'s types.
  - `team` can be a `readonly string[]`, so `PLAYBOOKS[team]` isn't a valid index either.
  - If the type error is bypassed, the model is shown `team_playbook: undefined` and has nothing to route on.
- **Fix:** mirror `docs/tutorial/team-playbooks.mdx`, which already does this correctly. It narrows with `Array.isArray(team) ? team[0] : team` and passes a `description`.

## 4. Dynamic skill name rule contradicts the skills page

- **Docs:** `docs/guides/dynamic-capabilities.md` says dynamic skill names must "start with a letter". `docs/skills.mdx` says names may "start with a letter or digit".
- **Code:** both use the same pattern, `/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/` (`packages/eve/src/discover/grammar.ts`, `SKILL_NAME_PATTERN`), so a leading digit is allowed.
- **Fix:** change "start with a letter" to "start with a letter or digit" in the dynamic capabilities guide.

## Validation

- `pnpm docs:check` after the edits.
- Optionally, paste the corrected examples from items 2 and 3 into a fixture agent and run `pnpm typecheck`.
