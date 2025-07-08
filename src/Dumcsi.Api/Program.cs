using Dumcsi.Api.Hubs;
using Dumcsi.Infrastructure.Database.Persistence;
using Dumcsi.Infrastructure.Services.JwtFactory;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using NodaTime.Serialization.SystemTextJson;
using Scalar.AspNetCore;
using Dumcsi.Application.Interfaces;

var builder = WebApplication.CreateBuilder(args); // Web alkalmazás létrehozása

const string myAllowSpecificOrigins = "_myAllowSpecificOrigins";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: myAllowSpecificOrigins,
        policy  =>
        {
            // Add your frontend's development URL
            policy.WithOrigins("http://localhost:5173") 
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials(); // Crucial for SignalR authentication
        });
});

builder.Services.AddControllers() // Kontroller alapú API engedélyezése
    .AddJsonOptions(options =>
    {
        var nodaSettings = DateTimeZoneProviders.Tzdb;
        options.JsonSerializerOptions.ConfigureForNodaTime(nodaSettings);
    });

builder.Services.AddOpenApi(); // OpenAPI dokumentáció engedélyezése

builder.Services.AddSignalR(); // SignalR engedélyezése

// Entity Framework Core DbContext regisztrálása
builder.Services
    .AddPooledDbContextFactory<DumcsiDbContext>(options => options
        .EnableSensitiveDataLogging(builder.Environment.IsDevelopment())
        .EnableDetailedErrors(builder.Environment.IsDevelopment())
        .UseNpgsql(builder.Configuration.GetConnectionString(DumcsiDbContext.Path), npgsql => npgsql
            .UseNodaTime()
        )
    );

builder.Services.AddJwtAuthentication(builder.Configuration); // JWT alapú hitelesítés engedélyezése

builder.Services.AddScoped<IAuthService, AuthService>(); // Hitelesítési szolgáltatás regisztrálása
builder.Services.AddScoped<IServerSetupService, ServerSetupService>(); // Szerver beállító szolgáltatás regisztrálása
builder.Services.AddScoped<IPermissionService, PermissionService>(); // Jogosultság kezelő szolgáltatás regisztrálása
builder.Services.AddScoped<IAuditLogService, AuditLogService>(); // Audit log szolgáltatás regisztrálása
builder.Services.AddSingleton<IFileStorageService, MinioFileStorageService>(); // Fájl tároló szolgáltatás regisztrálása
builder.Services.AddSingleton<IPresenceService, PresenceService>(); // Online/Offline állapot szolgáltatás regisztrálása


var app = builder.Build(); // Alkalmazás létrehozása

// Database inicializálás védve
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    try
    {
        var dbContext = app.Services.GetRequiredService<IDbContextFactory<DumcsiDbContext>>()
            .CreateDbContext();
        
        try
        {
            dbContext.Database.EnsureDeleted();
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "3D000")  { /* DB doesn't exist */}
        
        try
        {
            dbContext.Database.EnsureCreated();
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P04") { /* DB exists */}
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database initialization failed: {ex.Message}");
    }
}

// OpenAPI csak Development-ben
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// CORS beállítások alkalmazása
app.UseCors(myAllowSpecificOrigins);

app.UseAuthorization();

app.UseHttpsRedirection(); // HTTPS engedélyezése

app.MapHub<ChatHub>("/chathub"); // SignalR hub regisztrálása

app.MapControllers(); // Kontroller alapú API végpontok regisztrálása

app.Run(); // Alkalmazás futtatása