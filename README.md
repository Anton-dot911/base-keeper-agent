# Base Keeper Agent

Shadow-mode starter for a Base/Morpho liquidation keeper agent.

This repository is prepared for:

1. **Railway first** — fast hosted shadow worker.
2. **VPS migration later** — Docker Compose deployment with restart policy and persistent logs.

## Safety status

This starter is intentionally read-only.

- No private key required.
- `EXECUTION_ENABLED=true` is blocked.
- `SHADOW_MODE=false` is blocked.
- Solidity execution contract is a placeholder and reverts.

## Quick local start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Health check:

```bash
curl http://127.0.0.1:8080/health
```

## Railway start

1. Push this repository to GitHub.
2. In Railway, create a new project from the GitHub repository.
3. Set variables from `.env.example`.
4. Keep these safety variables:

```env
SHADOW_MODE=true
EXECUTION_ENABLED=false
NO_PRIVATE_KEY=true
```

The service exposes `/health` on port `8080`.

## VPS start

```bash
cp .env.example .env
# edit .env

docker compose up -d --build
docker logs -f base-keeper-agent
```

Reboot test:

```bash
sudo reboot
# reconnect
cd base-keeper-agent
docker ps
docker logs --tail=100 base-keeper-agent
```

## Current worker behavior

The worker:

- connects to Base RPC;
- reads the latest block;
- runs a shadow scan loop;
- exposes `/health`;
- writes JSONL events to `DATA_DIR`;
- never sends transactions.

The Morpho scanner is intentionally a safe placeholder. Add real Morpho market/position reading in `packages/morpho-client` after selecting initial markets.

## Useful commands

```bash
pnpm start
pnpm typecheck
pnpm docker:build
pnpm docker:run
```

## Next implementation steps

1. Configure 3–5 initial Morpho market IDs.
2. Add Morpho market data reader.
3. Add borrower/position scanner.
4. Implement health factor calculation per real market data.
5. Persist candidates.
6. Run Railway shadow mode for 7 days.
7. Migrate to VPS and run in parallel for 24–48 hours.
8. Add simulator only after scanner is stable.
9. Add execution only after simulator and security review.
