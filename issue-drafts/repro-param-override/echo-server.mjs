// Prints the URL of every request eve sends to the OpenAPI connection.
import { createServer } from "node:http";

createServer((req, res) => {
  console.log(`[echo-server] ${req.method} ${req.url}`);
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ receivedUrl: req.url }));
}).listen(4010, () => console.log("[echo-server] listening on http://localhost:4010"));
