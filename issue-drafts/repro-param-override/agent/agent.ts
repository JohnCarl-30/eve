import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

// A scripted model so the reproduction needs no API key. It finds the
// `items__list` tool with eve__search (which prints its input schema), calls
// it with { limit: 10 }, then replies with both results.
export default defineAgent({
  model: mockModel(({ toolResults }) => {
    if (toolResults.length === 0) {
      return { toolCalls: [{ name: "eve__search", input: { query: "items__" } }] };
    }
    if (toolResults.length === 1) {
      return {
        toolCalls: [{ name: "eve__tool", input: { name: "items__list", input: { limit: 10 } } }],
      };
    }
    return toolResults.map((r) => `${r.name}: ${JSON.stringify(r.output)}`).join("\n\n");
  }),
});
