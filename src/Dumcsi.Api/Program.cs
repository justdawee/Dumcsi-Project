using Dumcsi.Infrastructure.Services.JwtFactory;
using Dumcsi.Server.Database;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

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

var app = builder.Build();

var dbContext = app.Services.GetRequiredService<IDbContextFactory<DumcsiDbContext>>()
    .CreateDbContext();

dbContext.Database.EnsureDeleted(); // For development purposes, ensure the database is deleted on startup

dbContext.Database.EnsureCreated(); // Ensure the database is created

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();
