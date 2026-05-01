import { setTimeout as sleep } from "node:timers/promises";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

import { loadConfig } from "../../../packages/config/src/env.js";
import { createLogger } from "../../../packages/config/src/logger.js";
import { loadConfiguredMarkets } from "../../../packages/morpho-client/src/market-config.js";
import { runShadowMorphoScan } from "../../../packages/morpho-client/src/shadow-scanner.js";
import { appendJsonl } from "../../../packages/storage/src/jsonl.js";
import { startHealthServer, type WorkerStatus } from "./health-server.js";

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL);

const port = Number(process.env.PORT ?? config.HEALTH_PORT ?? 8080);

const status: WorkerStatus = {
  service: "base-keeper-agent",
  mode: "shadow",
  startedAt: new Date().toISOString(),
  lastScanAt: null,
  lastBlockNumber: null,
  scanCount: 0,
  lastError: null
};

const client = createPublicClient({
  chain: base,
  transport: http(config.BASE_RPC_URL, {
    retryCount: 2,
    timeout: 10_000
  })
});

startHealthServer(port, () => status);

async function scanOnce(): Promise<void> {
  const startedAt = Date.now();

  const blockNumber = await client.getBlockNumber();
  const markets = loadConfiguredMarkets(config.morphoMarketIds);
  const scan = await runShadowMorphoScan({ client, markets });

  const event = {
    type: "scan_completed",
    service: status.service,
    mode: status.mode,
    chainId: config.CHAIN_ID,
    blockNumber: blockNumber.toString(),
    scanDurationMs: Date.now() - startedAt,
    ...scan,
    executionEnabled: false,
    timestamp: new Date().toISOString()
  };

  status.lastScanAt = event.timestamp;
  status.lastBlockNumber = event.blockNumber;
  status.scanCount += 1;
  status.lastError = null;

  logger.info(event, "Shadow scan completed");
  await appendJsonl(config.DATA_DIR, "runtime-events.jsonl", event);
}

async function main(): Promise<void> {
  logger.info(
    {
      service: status.service,
      mode: status.mode,
      chainId: config.CHAIN_ID,
      healthPort: port,
      scanIntervalMs: config.SCAN_INTERVAL_MS,
      executionEnabled: false,
      noPrivateKey: config.NO_PRIVATE_KEY,
      marketsConfigured: config.morphoMarketIds.length
    },
    "Keeper worker starting"
  );

  while (true) {
    try {
      await scanOnce();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      status.lastError = message;

      logger.error({ error: message }, "Shadow scan failed");

      await appendJsonl(config.DATA_DIR, "runtime-events.jsonl", {
        type: "scan_failed",
        service: status.service,
        mode: status.mode,
        error: message,
        timestamp: new Date().toISOString()
      });
    }

    await sleep(config.SCAN_INTERVAL_MS);
  }
}

process.on("SIGTERM", () => {
  logger.warn("SIGTERM received; exiting gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.warn("SIGINT received; exiting gracefully");
  process.exit(0);
});

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  status.lastError = message;
  logger.error({ error: message }, "Keeper worker crashed");

  process.exit(1);
});
