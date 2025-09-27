<div align="center">

# Dumcsi Chat

Realtime chat platform built with ASP.NET Core (.NET 9) and Vue 3 + Vite, featuring SignalR for realtime messaging, MinIO for object storage, and LiveKit for voice/video.

</div>

---

## Highlights

- Docker-first local environment with Postgres, MinIO, LiveKit, Backend, and Frontend
- Clean separation: `src/Dumcsi.Backend` (ASP.NET Core) and `src/Dumcsi.Frontend` (Vue 3)
- Environment-driven configuration with sane defaults (`.env.example`)

---

## Quick Start (Docker)

The fastest way to run everything locally.

### Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)

### 1) Configure environment

Copy the sample env file and adjust only if needed:

```bash
cp .env.example .env
```

Key defaults (change if ports are taken):

- Backend: http://localhost:5000 (proxied via frontend at /api)
- Frontend: http://localhost:5173 (set `FRONTEND_HOST_PORT` to change)
- MinIO: http://localhost:9000 (S3 API), http://localhost:9001 (Console)
- LiveKit: ws://localhost:7880

### 2) Build and start

```bash
docker compose up -d --build
```

Compose services:

- `postgres` (database), `minio` + `minio-init` (object storage + policy), `livekit` (screenshare/webcam)
- `backend` (ASP.NET Core), `frontend` (Nginx serving built SPA)

### 3) Open the app

- Frontend: http://localhost:${FRONTEND_HOST_PORT:-5173}
- API: http://localhost:${FRONTEND_HOST_PORT:-5173}/api (proxied)
  - Direct backend (optional): http://localhost:5000/api
- MinIO Console: http://localhost:9001 (use `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`)

### Useful compose commands

```bash
docker compose logs -f backend frontend           # Tail FE/BE logs
docker compose ps                                 # Check service status
docker compose down                               # Stop (keep data)
docker compose down -v                            # Stop and delete volumes
```

Persisted volumes: `pgdata`, `minio-data`, `minio-config`.

---

## Manual Setup (No Docker)

Run the backend and frontend directly with your local tools. This is useful for IDE debugging or partial containerization.

### Requirements

- .NET SDK 9.0
- Node.js 20.x (npm 10+)
- PostgreSQL 16
- MinIO server (for S3-compatible storage)
- LiveKit server (for screensharing/webcam). You can run the official binary or Docker container.

### 1) Database (PostgreSQL)

Create a database and user, then capture a connection string like:

```
Host=localhost;Port=5432;Database=dumcsi_db;Username=postgres;Password=postgres
```

Set it for the backend via environment variable or `appsettings.Development.json`:

```
ConnectionStrings:DumcsiDb=Host=localhost;Port=5432;Database=dumcsi_db;Username=postgres;Password=postgres
```

### 2) Object Storage (MinIO)

Start MinIO locally and create a bucket (default: `dumcsi`). Create an access key/secret for the backend. Configure the backend:

```
Minio:Endpoint=localhost:9000
Minio:AccessKey=your-access
Minio:SecretKey=your-secret
Minio:UseSSL=false
Minio:BucketName=dumcsi
```

Tip: If running the MinIO Docker image locally, map `9000:9000` and `9001:9001` and use the console to create the bucket/user.

### 3) LiveKit (Screenshare/Webcam)

Run LiveKit server locally and note the WebSocket URL (default: `ws://localhost:7880`). Set backend + frontend to point to it:

```
LiveKit:ServerUrl=ws://localhost:7880
LiveKit:ApiKey=devkey
LiveKit:ApiSecret=devsecret
```

Generate your own key/secret in non-dev environments.

### 4) Backend (ASP.NET Core)

From the repo root:

```bash
ASPNETCORE_ENVIRONMENT=Development dotnet build src/Dumcsi.Backend
ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/Dumcsi.Backend
```

Default URL: `http://localhost:5000` (CORS is controlled by `Cors:AllowedOrigins`).

### 5) Frontend (Vue 3 + Vite)

Create `src/Dumcsi.Frontend/.env.local` with your endpoints (or rely on defaults):

```
VITE_API_URL=/api
VITE_LIVEKIT_URL=ws://localhost:7880
```

Then run the dev server:

```bash
cd src/Dumcsi.Frontend
npm install
npm run dev
```

Vite serves on `http://localhost:5173` by default.

---

## Configuration

- Backend config lives in `src/Dumcsi.Backend/appsettings*.json` and environment variables.
- For local dev, prefer environment variables or `appsettings.Development.json`.
- Do not commit secrets. Use environment variables or .NET User Secrets.
- CORS: set `Cors:AllowedOrigins` (comma-separated) to include your frontend origin.

Key environment variables (see `.env.example` for Docker):

- `ConnectionStrings__DumcsiDb`: PostgreSQL connection string
- `JWTFactoryOptions__Secret`: JWT signing secret
- `Minio__*`: MinIO endpoint and credentials
- `LiveKit__*`: LiveKit URL and API credentials
- `VITE_API_URL`, `VITE_LIVEKIT_URL`: Frontend build/runtime endpoints
- `VITE_TENOR_API_KEY`: Tenor GIF Search API key (optional)

---

## Project Structure

Backend: `src/Dumcsi.Backend`

- Controllers, Services, Models, Data, Hubs
- Configuration in `appsettings*.json`

Frontend: `src/Dumcsi.Frontend`

- Views in `src/views/*View.vue`
- API clients in `src/services/*.ts`
- Stores in `src/stores/*.ts`
- Composables in `src/composables/use*.ts`

Solution: `DumcsiProject.sln`

---

## Useful Commands

- Backend build: `dotnet build src/Dumcsi.Backend`
- Backend run: `ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/Dumcsi.Backend`
- Frontend dev: `cd src/Dumcsi.Frontend && npm install && npm run dev`
- Frontend build: `npm run build && npm run preview`

---

## Troubleshooting

- CORS errors: Ensure `Cors:AllowedOrigins` includes your frontend origin.
- Port conflicts: Change `FRONTEND_HOST_PORT` or `ASPNETCORE_URLS` (and re-run).
- MinIO access denied: Verify bucket exists and service user has RW policy.
- LiveKit connectivity: Ensure UDP ports `50000-50200/udp` are reachable locally.

---

## License

This project is licensed under the terms of the LICENSE file included in the repository.
