namespace Dumcsi.Server.Services.JWTFactory;

public static class JWTFactoryExtensions
{
    public static IServiceCollection AddJWTFactory(this IServiceCollection services, IConfigurationSection section)
    {
        services.Configure<JWTFactoryOptions>(section);
        services.AddSingleton<IJWTFactory, JWTFactory>();
        return services;
    }
}