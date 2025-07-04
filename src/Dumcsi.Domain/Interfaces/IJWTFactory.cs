namespace Dumcsi.Domain.Interfaces;

public interface IJWTFactory
{
    string CreateToken(long userId, string username, string securityStamp);
    
}