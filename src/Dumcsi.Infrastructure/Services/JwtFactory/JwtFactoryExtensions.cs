using Dumcsi.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Dumcsi.Infrastructure.Services.JwtFactory;

public static class JwtFactoryExtensions
{
    public static IServiceCollection AddJwtFactory(this IServiceCollection services, IConfigurationSection section)
    {
        services.Configure<JwtFactoryOptions>(section);
        services.AddSingleton<IJWTFactory, JwtFactory>();
        return services;
    }
}