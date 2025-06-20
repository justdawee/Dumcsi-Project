namespace Dumcsi.Server.Services.JWTFactory;

public interface IJWTFactory
{
    string CreateToken(long userId, string username);
    
}