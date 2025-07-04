using Dumcsi.Infrastructure.Database.Persistence;
using Dumcsi.Infrastructure.Services.JwtFactory;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using NodaTime.Serialization.SystemTextJson;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        var nodaSettings = DateTimeZoneProviders.Tzdb;
        options.JsonSerializerOptions.ConfigureForNodaTime(nodaSettings);
    });

builder.Services.AddOpenApi();

builder.Services
    .AddPooledDbContextFactory<DumcsiDbContext>(options => options
        .EnableSensitiveDataLogging(builder.Environment.IsDevelopment())
        .EnableDetailedErrors(builder.Environment.IsDevelopment())
        .UseNpgsql(builder.Configuration.GetConnectionString(DumcsiDbContext.Path), npgsql => npgsql
            .UseNodaTime()
        )
    );

builder.Services.AddJwtAuthentication(builder.Configuration);

builder.Services.AddScoped<IAuditLogService, AuditLogService>();

var app = builder.Build();

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

app.UseCors(builder => builder
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

app.UseHttpsRedirection();

app.MapControllers();

app.Run();