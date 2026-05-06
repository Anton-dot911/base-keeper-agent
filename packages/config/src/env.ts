import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().default("production"),
  LOG_LEVEL: z.string().default("info"),
  BASE_RPC_URL: z.string().default("https://mainnet.base.org"),
  CHAIN_ID: z.coerce.number().default(8453),
  HEALTH_PORT: z.coerce.number().default(8080),
  SCAN_INTERVAL_MS: z.coerce.number().default(60_000),
  DATA_DIR: z.string().default("/app/data"),
  NO_PRIVATE_KEY: z.coerce.boolean().default(true),
  MORPHO_MARKET_IDS: z.string().default(""),

  ALERT_EMAIL_ENABLED: z.coerce.boolean().default(false),
  ALERT_EMAIL_TEST_ON_STARTUP: z.coerce.boolean().default(false),
  ALERT_EMAIL_TO: z.string().default(""),
  ALERT_EMAIL_FROM: z.string().default("Base Keeper Agent <alerts@resend.dev>"),
  RESEND_API_KEY: z.string().default(""),
  MIN_EXECUTION_NET_PROFIT_USD: z.coerce.number().default(10),
  MIN_EXECUTION_CONFIDENCE: z.enum(["low", "medium", "high"]).default("high"),

  COPILOT_ENABLED: z.coerce.boolean().default(true),

  PAYMASTER_POLICY_ENABLED: z.coerce.boolean().default(true),
  PAYMASTER_KILL_SWITCH: z.coerce.boolean().default(false),
  MIN_PAYMASTER_NET_PROFIT_USD: z.coerce.number().default(10),
  MAX_PAYMASTER_GAS_USD: z.coerce.number().default(5),
  MAX_PAYMASTER_GAS_TO_PROFIT_RATIO: z.coerce.number().default(0.3),
  PAYMASTER_DAILY_BUDGET_USD: z.coerce.number().default(50),
  PAYMASTER_DAILY_SPENT_USD: z.coerce.number().default(0)
});

export function loadConfig() {
  const env = EnvSchema.parse(process.env);

  return {
    ...env,
    morphoMarketIds: env.MORPHO_MARKET_IDS
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  };
}
