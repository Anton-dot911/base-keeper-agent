# VPS migration guide

## Target

Move the same shadow worker from Railway to an Ubuntu VPS using Docker Compose.

## Minimum VPS for shadow mode

- Ubuntu 24.04 LTS or 22.04 LTS
- 2 vCPU
- 2–4 GB RAM
- 40 GB SSD
- SSH key login

## 1. Basic server setup

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
sudo ufw allow OpenSSH
sudo ufw enable
```

Install Docker Engine using Docker's official Ubuntu instructions.

## 2. Clone repository

```bash
git clone https://github.com/YOUR_USERNAME/base-keeper-agent.git
cd base-keeper-agent
cp .env.example .env
nano .env
```

Keep:

```env
SHADOW_MODE=true
EXECUTION_ENABLED=false
NO_PRIVATE_KEY=true
```

## 3. Run with Docker Compose

```bash
docker compose up -d --build
docker logs -f base-keeper-agent
```

## 4. Verify health

```bash
curl http://127.0.0.1:8080/health
```

## 5. Reboot test

```bash
sudo reboot
```

Reconnect and verify:

```bash
cd base-keeper-agent
docker ps
docker logs --tail=100 base-keeper-agent
```

## 6. Parallel run with Railway

Run Railway and VPS together for 24–48 hours. Compare:

- scan count;
- latest block number;
- error count;
- uptime;
- candidate events.

Do not stop Railway until VPS has passed the reboot and 48-hour stability check.
