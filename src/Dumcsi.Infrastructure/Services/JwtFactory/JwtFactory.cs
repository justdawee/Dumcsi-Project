using Dumcsi.Domain.Interfaces;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Dumcsi.Infrastructure.Services.JwtFactory;

public class JwtFactory(IOptions<JwtFactoryOptions> options) : IJWTFactory
{
    public string CreateToken(long userId, string username, string securityStamp)
    {
        var option = options.Value;
        
        JsonWebTokenHandler tokenHandler = new JsonWebTokenHandler();
        
        var token = tokenHandler.CreateToken(new SecurityTokenDescriptor()
        {
            Issuer = option.Issuer,
            Audience = option.Audience,
            Subject = new System.Security.Claims.ClaimsIdentity(new[]
            {
                new System.Security.Claims.Claim("sub", userId.ToString()),
                new System.Security.Claims.Claim("username", username),
                new System.Security.Claims.Claim("security_stamp", securityStamp)
            }),
            Expires = DateTime.UtcNow.Add(option.TokenLifetime),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Convert.FromBase64String(option.Secret)), 
                SecurityAlgorithms.HmacSha256Signature
            )
        });
        
        return token;
    }
}