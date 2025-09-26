# Dumcsi.Backend

ASP.NET Core (.NET 9) Web API and SignalR backend for the Dumcsi Project. This service exposes REST endpoints (under `Controllers/`) and real-time hubs (under `Hubs/`) and follows a clean separation of concerns with `Services/`, `Models/`, and `Data/` layers.

## Tech Stack

- ASP.NET Core 9 (Web API)
- SignalR (real-time communication)
- C# with nullable reference types enabled

## Project Layout

```
src/Dumcsi.Backend/
├─ Controllers/          # HTTP API endpoints
├─ Services/             # Domain/application services
├─ Models/               # DTOs, requests, responses, domain models
├─ Data/                 # Data access related code (e.g., contexts, repositories)
├─ Hubs/                 # SignalR hub endpoints
├─ appsettings.json      # Base configuration
├─ appsettings.Development.json  # Local dev overrides (do not commit secrets)
└─ Program.cs, ...       # Host, middleware, DI setup
```

## Prerequisites

- .NET SDK 9.x
- (Optional) Docker, if you plan to containerize

## Getting Started

Restore, build, and run the backend in Development mode.

### 1) Restore and Build

```bash
# From repo root
dotnet restore src/Dumcsi.Backend

# Treat warnings as errors; build must be clean
dotnet build src/Dumcsi.Backend
```

### 2) Run (Development)

```bash
# macOS/Linux
export ASPNETCORE_ENVIRONMENT=Development
dotnet run --project src/Dumcsi.Backend

# Windows (PowerShell)
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project src/Dumcsi.Backend
```

The console output shows the bound URLs for HTTP/HTTPS. If Swagger/OpenAPI is enabled for Development, you can browse it at `/swagger` on the shown base URL.

Tip: For hot-reload during development, you can use:

```bash
dotnet watch --project src/Dumcsi.Backend run
```

## Configuration

Configuration is read from `appsettings.json`, environment-specific overrides (e.g., `appsettings.Development.json`), and environment variables. Do not commit secrets; for local development prefer the .NET Secret Manager or environment variables.

Common keys you may need:

- `ConnectionStrings:Default`
- `JWTFactoryOptions:Issuer`, `JWTFactoryOptions:Audience`, `JWTFactoryOptions:Secret`
- `Minio:Endpoint`, `Minio:AccessKey`, `Minio:SecretKey`, `Minio:Bucket`
- `LiveKit:Url`, `LiveKit:ApiKey`, `LiveKit:ApiSecret`

Example `appsettings.Development.json` (values are illustrative only):

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Port=5432;Database=dumcsi;User Id=postgres;Password=devpassword;"
  },
  "JWTFactoryOptions": {
    "Issuer": "dumcsi.local",
    "Audience": "dumcsi.clients",
    "Secret": "REPLACE_WITH_DEV_SECRET"
  },
  "Minio": {
    "Endpoint": "http://localhost:9000",
    "AccessKey": "minioadmin",
    "SecretKey": "minioadmin",
    "Bucket": "dumcsi"
  },
  "LiveKit": {
    "Url": "https://livekit.example.local",
    "ApiKey": "dev",
    "ApiSecret": "dev"
  }
}
```

Environment variables can replace any key by using `__` (double underscore) separators, e.g.:

```bash
# macOS/Linux
export ConnectionStrings__Default="..."
export JWTFactoryOptions__Secret="..."

# Windows (PowerShell)
$env:ConnectionStrings__Default = "..."
$env:JWTFactoryOptions__Secret = "..."
```

## API and Hubs

- REST endpoints live under `Controllers/` and follow standard ASP.NET Core routing.
- SignalR hubs are under `Hubs/`. The hub path is configured in `Program.cs` (look for `app.MapHub<...>("/hubs/...")`).

Minimal JavaScript client example (adjust the path to match your hub registration):

```js
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("/hubs/your-hub")
  .withAutomaticReconnect()
  .build();

await connection.start();
await connection.invoke("ServerMethod", { example: true });
connection.on("ClientEvent", payload => console.log(payload));
```

## Development Conventions

- Nullable enabled; treat warnings as errors.
- PascalCase for types/methods; camelCase for locals/fields.
- Interfaces prefixed with `I` (e.g., `IAuthService`).
- One class per file; keep files small and focused.
- Keep imports tidy and remove unused code.

## Testing

A test runner is not yet configured. If/when adding tests:

- Backend: prefer xUnit in a new project named `Dumcsi.Backend.Tests`.
- Run tests with `dotnet test` at the solution level.

## Docker

The root `Dockerfile` in this repository targets legacy project paths. Verify it before use, or create a new Dockerfile specifically for `Dumcsi.Backend`.

Example multi-stage Dockerfile (adjust as needed):

```dockerfile
# Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore src/Dumcsi.Backend \
 && dotnet publish src/Dumcsi.Backend -c Release -o /app/publish /p:UseAppHost=false

# Run
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Dumcsi.Backend.dll"]
```

## Troubleshooting

- HTTPS dev cert: if HTTPS launch fails locally, run `dotnet dev-certs https --trust` and restart.
- Port binding: set a custom port with `ASPNETCORE_URLS` (e.g., `http://localhost:5000;https://localhost:5001`).
- CORS: if the Vue frontend cannot reach the API or hubs, check CORS and hub endpoint configuration in `Program.cs`.

## Contributing

- Commits: imperative mood, concise scope (e.g., "Add session management endpoints").
- PRs: include summary, linked issue(s), testing notes, and screenshots/GIFs for UI-affecting changes.
- Configuration/Secrets: never commit secrets; use environment variables or User Secrets for local dev.

---

For the frontend and solution-level instructions, see the repository root README or `src/Dumcsi.Frontend/README.md` if present.
