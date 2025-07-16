FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["src/Dumcsi.Api/Dumcsi.Api.csproj", "src/Dumcsi.Api/"]
COPY ["src/Dumcsi.Application/Dumcsi.Application.csproj", "src/Dumcsi.Application/"]
COPY ["src/Dumcsi.Domain/Dumcsi.Domain.csproj", "src/Dumcsi.Domain/"]
COPY ["src/Dumcsi.Infrastructure/Dumcsi.Infrastructure.csproj", "src/Dumcsi.Infrastructure/"]
RUN dotnet restore "src/Dumcsi.Api/Dumcsi.Api.csproj"

COPY . .

WORKDIR "/src/src/Dumcsi.Api"
RUN dotnet build "Dumcsi.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Dumcsi.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

COPY --from=publish /app/publish .

ENTRYPOINT ["dotnet", "Dumcsi.Api.dll"]