namespace Dumcsi.Server.Services.JWTFactory;

public sealed class JWTFactoryOptions
{
    public string Secret { get; set; } = null!;
    public string Issuer { get; set; } = null!;
    public string Audience { get; set; } = null!;
}