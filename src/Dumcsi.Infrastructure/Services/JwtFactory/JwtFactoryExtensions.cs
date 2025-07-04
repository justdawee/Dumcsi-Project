using System.Security.Claims;
using Dumcsi.Domain.Interfaces;
using Dumcsi.Infrastructure.Database.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
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
            
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    // A DI konténerből elkérjük a DbContextFactory-t.
                    var dbContextFactory = context.HttpContext.RequestServices.GetRequiredService<IDbContextFactory<DumcsiDbContext>>();
                    await using var dbContext = await dbContextFactory.CreateDbContextAsync();
                    
                    // Kiolvassuk a szükséges claim-eket a validált tokenből.
                    var userIdClaim = context.Principal?.FindFirstValue("sub");
                    var tokenStamp = context.Principal?.FindFirstValue("security_stamp");

                    if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(tokenStamp) || !long.TryParse(userIdClaim, out var userId))
                    {
                        // Ha hiányoznak a szükséges adatok, érvénytelenítjük a kérést.
                        context.Fail("Invalid token: missing required claims.");
                        return;
                    }

                    // Lekérdezzük a felhasználó aktuális Security Stamp-jét az adatbázisból.
                    var user = await dbContext.Users
                        .AsNoTracking()
                        .Select(u => new { u.Id, u.SecurityStamp })
                        .FirstOrDefaultAsync(u => u.Id == userId);

                    // Ha a felhasználó nem létezik, vagy a bélyeg az adatbázisban nem egyezik a tokenben lévővel,
                    // a token érvénytelen.
                    if (user == null || user.SecurityStamp != tokenStamp)
                    {
                        context.Fail("Invalid security stamp. The token has been revoked.");
                    }
                    
                    // Ha minden rendben, a validáció sikeresen lefut tovább.
                }
            };
        });
        
        services.AddAuthorization();
        services.AddJwtFactory(configuration.GetSection(nameof(JwtFactoryOptions)));

        return services;
    }
}