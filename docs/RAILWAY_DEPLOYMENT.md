# Railway deployment guide

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial Railway-ready shadow keeper"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/base-keeper-agent.git
git push -u origin main
```

## 2. Create Railway project

Railway → New Project → Deploy from GitHub repo → select `base-keeper-agent`.

This repository includes:

- `Dockerfile`
- `railway.json`
- `/health` endpoint
- `pnpm start`

## 3. Railway variables

Set these variables:

```env
BASE_RPC_URL=https://mainnet.base.org
BASE_PRECONF_RPC_URL=https://mainnet-preconf.base.org
CHAIN_ID=8453
SHADOW_MODE=true
EXECUTION_ENABLED=false
NO_PRIVATE_KEY=true
SCAN_INTERVAL_MS=30000
HEALTH_PORT=8080
LOG_LEVEL=info
MIN_NET_PROFIT_USD=5
MAX_POSITION_SIZE_USD=100
MAX_DAILY_LOSS_USD=0
MORPHO_MARKET_IDS=
DATA_DIR=./data
```

Do **not** add private keys.

## 4. Verify logs

Expected log shape:

```json
{
  "service": "base-keeper-agent",
  "mode": "shadow",
  "chainId": 8453,
  "executionEnabled": false
}
```

Expected health route:

```bash
curl https://YOUR_RAILWAY_DOMAIN/health
```

## 5. Acceptance checklist

- deployment succeeds;
- `/health` returns JSON;
- latest Base block is logged;
- scan events appear every `SCAN_INTERVAL_MS`;
- `executionEnabled` is always `false`;
- no private key is configured.
