## Multi-stage build for Dumcsi.Backend (.NET 9)

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution and restore
COPY DumcsiProject.sln ./
COPY src/Dumcsi.Backend/Dumcsi.Backend.csproj src/Dumcsi.Backend/
RUN dotnet restore src/Dumcsi.Backend/Dumcsi.Backend.csproj --nologo

# Copy sources and publish
COPY src/Dumcsi.Backend/ src/Dumcsi.Backend/
RUN dotnet publish src/Dumcsi.Backend/Dumcsi.Backend.csproj -c Release -o /app/publish --no-restore --nologo

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Use non-root
RUN useradd -m appuser
USER appuser

# Expose and bind to 5000 (overridable by env)
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

COPY --from=build /app/publish/ ./

# Entry DLL
ENTRYPOINT ["dotnet", "Dumcsi.Backend.dll"]

