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
    const url = request.url?.split("?")[0];

    if (url === "/health" || url === "/api/health" || url === "/") {
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
