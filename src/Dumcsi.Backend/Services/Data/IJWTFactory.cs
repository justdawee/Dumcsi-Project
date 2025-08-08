namespace Dumcsi.Backend.Services.Data;

public interface IJWTFactory
{
    string CreateToken(long userId, string username, string securityStamp);
    
}
