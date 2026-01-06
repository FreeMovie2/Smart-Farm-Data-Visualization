# Docker (on-prem, Phase 1)

## Prerequisites
- Docker Desktop (or Docker Engine) with `docker compose`

## Run (dev)
From `infra/docker`:

```powershell
Copy-Item ..\\..\\.env.example .env
docker compose up --build
```

If you need to (re)apply DB init scripts (schema/seed), reset the volume:

```powershell
docker compose down -v
docker compose up --build
```

Endpoints:
- Web: http://localhost:3000
- API: http://localhost:4000/health

## Phase 8 (Validation)
From `infra/docker`:

```powershell
.\scripts\smoke.ps1
.\scripts\load-test-ingest.ps1 -Requests 200 -Concurrency 10
.\scripts\offline-scenario.ps1 -OfflineAfterMin 1
.\scripts\restart-recovery.ps1
```
