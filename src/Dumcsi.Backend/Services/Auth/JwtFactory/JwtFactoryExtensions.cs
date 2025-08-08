using System.Security.Claims;
using Dumcsi.Backend.Services.Auth;
using Dumcsi.Backend.Data.Context;
using Dumcsi.Backend.Services.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Dumcsi.Backend.Services.Auth.JwtFactory;

public static class JwtFactoryExtensions
{
    public static IServiceCollection AddJwtFactory(this IServiceCollection services, IConfigurationSection section)
    {
        services.Configure<JwtFactoryOptions>(section);
        services.AddSingleton<IJWTFactory, JwtFactory>();
        return services;
    }
    
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var configSection = configuration.GetSection(nameof(JwtFactoryOptions));
        
        if (!configSection.Exists())
        {
            var environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? "Production";
            var fileName = environment == "Development" ? "appsettings.Development.json" : "appsettings.json";
        
            throw new InvalidOperationException(
                $"Missing 'JWTFactoryOptions' configuration section. " +
                $"Please add the following to your {fileName}:\n\n" +
                "\"JWTFactoryOptions\": {\n" +
                "  \"Issuer\": \"YourIssuer\",\n" +
                "  \"Audience\": \"YourAudience\",\n" +
                "  \"Secret\": \"YourBase64EncodedSecret\"\n" +
                "}");
        }

        JwtFactoryOptions jwtFactoryOptions = new();
        configSection.Bind(jwtFactoryOptions);
        
        JwtOptionsValidator.Validate(jwtFactoryOptions);

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.ClaimsIssuer = jwtFactoryOptions.Issuer;
            options.Audience = jwtFactoryOptions.Audience;
            options.RequireHttpsMetadata = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtFactoryOptions.Issuer,
                ValidAudience = jwtFactoryOptions.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Convert.FromBase64String(jwtFactoryOptions.Secret))
            };
            
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];

                    // Handle WebSocket authentication for ChatHub connections
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) &&
                        (path.StartsWithSegments("/chathub")))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                },
                OnTokenValidated = async context =>
                {
                    // Get DbContextFactory from DI container
                    var dbContextFactory = context.HttpContext.RequestServices.GetRequiredService<IDbContextFactory<DumcsiDbContext>>();
                    await using var dbContext = await dbContextFactory.CreateDbContextAsync();
                    
                    // Extract required claims from validated token
                    var userIdClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                    var tokenStamp = context.Principal?.FindFirstValue("security_stamp");

                    if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tokenStamp) || !long.TryParse(userIdClaim, out var userId))
                    {
                        // Fail validation if required claims are missing
                        context.Fail("Invalid token: missing required claims.");
                        return;
                    }

                    // Query user's current security stamp from database
                    var user = await dbContext.Users
                        .AsNoTracking()
                        .Select(u => new { u.Id, u.SecurityStamp })
                        .FirstOrDefaultAsync(u => u.Id == userId);

                    // Validate security stamp to ensure token hasn't been revoked
                    if (user == null || user.SecurityStamp != tokenStamp)
                    {
                        context.Fail("Invalid security stamp. The token has been revoked.");
                    }
                    
                }
            };
        });
        
        services.AddAuthorization();
        services.AddJwtFactory(configuration.GetSection(nameof(JwtFactoryOptions)));

        return services;
    }
}
