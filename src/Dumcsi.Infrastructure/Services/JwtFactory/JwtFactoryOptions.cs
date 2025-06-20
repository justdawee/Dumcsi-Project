namespace Dumcsi.Infrastructure.Services.JwtFactory;

public sealed class JwtFactoryOptions
{
    public string Secret { get; set; } = null!;
    public string Issuer { get; set; } = null!;
    public string Audience { get; set; } = null!;
}