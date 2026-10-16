**Title:** `eve set model` with no arguments tells you to pass a `--model` flag that doesn't exist

## Bug

Running `eve set model` with neither a model nor `--reasoning` prints:

```
Pass --model, --reasoning, or both.
```

and exits 1. But `eve set model` has no `--model` option: the model is a positional argument (`eve set model [model] [--reasoning <effort>]`, as registered in `packages/eve/src/cli/run.ts` and documented in `docs/reference/cli.md`).

## Reproduction

```sh
eve set model
# Pass --model, --reasoning, or both.   (exit 1)

eve set model --model openai/gpt-6-sol
# error: unknown option '--model'
```

Following the error's advice leads straight to a second error. That matters most for coding agents driving the CLI, which take error text literally and can loop on it. AGENTS.md calls this out directly: "Error messages make or break recovery."

## Cause

`packages/eve/src/cli/commands/set.ts:42`:

```ts
if (options.model === undefined && options.reasoning === undefined) {
  fail(logger, "Pass --model, --reasoning, or both.");
```

The message refers to the internal `options.model` field rather than the CLI surface. `set.test.ts` ("requires at least one setting") asserts the current string.

## Suggested fix

Make the message name the real syntax, for example:

```
Pass a model, --reasoning, or both. Example: eve set model openai/gpt-6-sol --reasoning high
```

Then update the expectation in `packages/eve/src/cli/commands/set.test.ts`. It's a user-visible CLI change to the published `eve` package, so it needs a `patch` changeset.

## Validation

- `pnpm --filter eve exec vitest run --config vitest.unit.config.ts src/cli/commands/set.test.ts`
- Manually: `eve set model` prints the new message and exits 1, and the example command it suggests works.
