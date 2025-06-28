using Microsoft.Extensions.Configuration;

namespace Dumcsi.Infrastructure.Services.JwtFactory;

public class JwtOptionsValidator
{
    public static void Validate(JwtFactoryOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Issuer))
        {
            throw new ArgumentException("Issuer must be provided", nameof(options.Issuer));
        }

        if (string.IsNullOrWhiteSpace(options.Audience))
        {
            throw new ArgumentException("Audience must be provided", nameof(options.Audience));
        }

        if (string.IsNullOrWhiteSpace(options.Secret))
        {
            throw new ArgumentException("Secret must be provided", nameof(options.Secret));
        }

        if (options.TokenLifetime <= TimeSpan.Zero)
        {
            throw new ArgumentException("Expiration time must be greater than zero", nameof(options.TokenLifetime));
        }
        
        if (!IsValidBase64(options.Secret))
        {
            throw new ArgumentException("Secret must be a valid base64 string", nameof(options.Secret));
        }

        if (GetSecretBytes(options.Secret).Length < 32)
        {
            throw new ArgumentException("Secret must be at least 256 bits (32 bytes) long", nameof(options.Secret));
        }
    }
    
    private static bool IsValidBase64(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return false;
        }

        try
        {
            // ReSharper disable once ReturnValueOfPureMethodIsNotUsed
            Convert.FromBase64String(input);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
    
    private static byte[] GetSecretBytes(string secret)
    {
        return Convert.FromBase64String(secret);
    }

}