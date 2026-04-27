import "dotenv/config";
import { z } from "zod";

const booleanString = z
  .string()
  .default("false")
  .transform((value) => value.toLowerCase() === "true");

const envSchema = z.object({
  BASE_RPC_URL: z.string().url(),
  BASE_PRECONF_RPC_URL: z.string().url().optional().or(z.literal("")),
  CHAIN_ID: z.coerce.number().int().default(8453),
  SHADOW_MODE: booleanString.default("true"),
  EXECUTION_ENABLED: booleanString.default("false"),
  NO_PRIVATE_KEY: booleanString.default("true"),
  SCAN_INTERVAL_MS: z.coerce.number().int().min(5_000).default(30_000),
  HEALTH_PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  MIN_NET_PROFIT_USD: z.coerce.number().nonnegative().default(5),
  MAX_POSITION_SIZE_USD: z.coerce.number().positive().default(100),
  MAX_DAILY_LOSS_USD: z.coerce.number().nonnegative().default(0),
  MORPHO_MARKET_IDS: z.string().optional().default(""),
  DATA_DIR: z.string().default("./data")
});

export type AppConfig = z.infer<typeof envSchema> & {
  morphoMarketIds: string[];
};

export function loadConfig(): AppConfig {
  const parsed = envSchema.parse(process.env);

  if (!parsed.SHADOW_MODE) {
    throw new Error("This starter must run with SHADOW_MODE=true. Remove this guard only after simulator and security review.");
  }

  if (parsed.EXECUTION_ENABLED) {
    throw new Error("EXECUTION_ENABLED=true is blocked in this starter repository.");
  }

  return {
    ...parsed,
    morphoMarketIds: parsed.MORPHO_MARKET_IDS
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  };
}
