using Dumcsi.Backend.Hubs;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Services.Auth.JwtFactory;
using Dumcsi.Backend.Services.Data;
using Dumcsi.Backend.Services.External;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using NodaTime.Serialization.SystemTextJson;
using Scalar.AspNetCore;
using Dumcsi.Backend.Services.Auth;

var builder = WebApplication.CreateBuilder(args);

const string myAllowSpecificOrigins = "_myAllowSpecificOrigins";
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: myAllowSpecificOrigins, policy =>
    {
        var configured = builder.Configuration.GetValue<string>("Cors:AllowedOrigins");
        var origins = (configured ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (origins.Length == 0)
        {
            origins = new[] { "http://localhost:5173" };
        }

        if (Array.Exists(origins, o => o == "*"))
        {
            // Note: AllowAnyOrigin is incompatible with AllowCredentials
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(origins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials(); // Crucial for SignalR authentication
        }
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        var nodaSettings = DateTimeZoneProviders.Tzdb;
        options.JsonSerializerOptions.ConfigureForNodaTime(nodaSettings);
    });

builder.Services.AddOpenApi();

builder.Services
    .AddSignalR()
    .AddJsonProtocol(options =>
    {
        var nodaSettings = DateTimeZoneProviders.Tzdb;
        options.PayloadSerializerOptions.ConfigureForNodaTime(nodaSettings);
    });

builder.Services
    .AddPooledDbContextFactory<DumcsiDbContext>(options => options
        .EnableSensitiveDataLogging(builder.Environment.IsDevelopment())
        .EnableDetailedErrors(builder.Environment.IsDevelopment())
        .UseNpgsql(builder.Configuration.GetConnectionString(DumcsiDbContext.Path), npgsql => npgsql
            .UseNodaTime()
        )
    );

builder.Services.AddJwtAuthentication(builder.Configuration);

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IServerSetupService, ServerSetupService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddSingleton<IFileStorageService, MinioFileStorageService>();
builder.Services.AddSingleton<IPresenceService, PresenceService>();
builder.Services.AddScoped<ILiveKitService, LiveKitService>();


var app = builder.Build();

// Database initialization for development
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

// Enable OpenAPI only in development
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors(myAllowSpecificOrigins);

app.UseAuthorization();

app.UseHttpsRedirection();

app.MapHub<ChatHub>("/chathub");

app.MapControllers();

app.Run();
