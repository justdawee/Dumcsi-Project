using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Dumcsi.Server.Services.JWTFactory;

public class JWTFactory(IOptions<JWTFactoryOptions> options) : IJWTFactory
{
    public string CreateToken(long userId, string username)
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
            }),
            Expires = DateTime.UtcNow.AddHours(1),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Convert.FromBase64String(option.Secret)), 
                SecurityAlgorithms.HmacSha256Signature
            )
        });
        
        return token;
    }
}