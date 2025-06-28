using Dumcsi.Domain.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Dumcsi.Infrastructure.Services.JwtFactory;

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
        });
        
        services.AddAuthorization();
        services.AddJwtFactory(configuration.GetSection(nameof(JwtFactoryOptions)));

        return services;
    }
}