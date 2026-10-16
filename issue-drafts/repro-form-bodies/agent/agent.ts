import { defineAgent } from "eve";
import { mockModel } from "eve/evals";

// A scripted model so the reproduction needs no API key. It calls the form
// endpoint, then searches for the Swagger 2.0 login tool to show its
// generated input signature.
export default defineAgent({
  model: mockModel(({ toolResults }) => {
    if (toolResults.length === 0) {
      return {
        toolCalls: [
          {
            name: "eve__tool",
            input: { name: "auth__token", input: { body: { grant_type: "client_credentials" } } },
          },
        ],
      };
    }
    if (toolResults.length === 1) {
      return { toolCalls: [{ name: "eve__search", input: { query: "legacy__" } }] };
    }
    return toolResults.map((r) => `${r.name}: ${JSON.stringify(r.output)}`).join("\n\n");
  }),
});
