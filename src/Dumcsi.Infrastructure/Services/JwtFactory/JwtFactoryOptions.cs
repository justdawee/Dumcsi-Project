namespace Dumcsi.Infrastructure.Services.JwtFactory;

public sealed class JwtFactoryOptions
{
    public string Secret { get; set; } = null!;
    
    public string Issuer { get; set; } = null!;
    
    public string Audience { get; set; } = null!;
    
    public TimeSpan TokenLifetime { get; set; } = TimeSpan.FromHours(1); // Default token lifetime is 1 hour
}