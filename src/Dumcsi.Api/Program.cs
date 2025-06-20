using Dumcsi.Infrastructure.Services.JwtFactory;
using Dumcsi.Server.Database;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

JwtFactoryOptions jwtFactoryOptions = new();

builder.Configuration.GetSection(nameof(JwtFactoryOptions))
    .Bind(jwtFactoryOptions);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
    {
        options.ClaimsIssuer = jwtFactoryOptions.Issuer;
        options.Audience = jwtFactoryOptions.Audience;
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new()
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtFactoryOptions.Issuer,
            ValidAudience = jwtFactoryOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Convert.FromBase64String(jwtFactoryOptions.Secret))
        };
    });

builder.Services.AddAuthorization();

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

builder.Services.AddJwtFactory(builder.Configuration.GetSection(nameof(JwtFactoryOptions)));

var app = builder.Build();

var dbContext = app.Services.GetRequiredService<IDbContextFactory<DumcsiDbContext>>()
    .CreateDbContext();

dbContext.Database.EnsureDeleted();
dbContext.Database.EnsureCreated();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();
