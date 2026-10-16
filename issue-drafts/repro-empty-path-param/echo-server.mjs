// Prints every request eve sends to the OpenAPI connection.
import { createServer } from "node:http";

createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    console.log(`[echo-server] ${req.method} ${req.url}`);
    if (req.headers["content-type"]) {
      console.log(`[echo-server]   content-type: ${req.headers["content-type"]}`);
    }
    if (body) console.log(`[echo-server]   body: ${body}`);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ method: req.method, receivedUrl: req.url, receivedBody: body }));
  });
}).listen(4010, () => console.log("[echo-server] listening on http://localhost:4010"));
