import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

// A scripted model so the reproduction needs no API key. It calls
// `items__deleteItem` with an empty `id`, which passes schema validation.
export default defineAgent({
  model: mockModel(({ toolResults }) => {
    if (toolResults.length === 0) {
      return {
        toolCalls: [{ name: "eve__tool", input: { name: "items__deleteItem", input: { id: "" } } }],
      };
    }
    return `${toolResults[0]?.name}: ${JSON.stringify(toolResults[0]?.output)}`;
  }),
});
