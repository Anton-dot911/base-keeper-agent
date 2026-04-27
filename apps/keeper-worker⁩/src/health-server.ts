import http from "node:http";

export type WorkerStatus = {
  service: string;
  mode: "shadow";
  startedAt: string;
  lastScanAt: string | null;
  lastBlockNumber: string | null;
  scanCount: number;
  lastError: string | null;
};

export function startHealthServer(port: number, getStatus: () => WorkerStatus) {
  const server = http.createServer((request, response) => {
    if (request.url === "/health" || request.url === "/") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true, ...getStatus() }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Not found" }));
  });

  server.listen(port, "0.0.0.0");
  return server;
}
