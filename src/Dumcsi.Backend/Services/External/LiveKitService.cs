using Dumcsi.Backend.Models.DTOs;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace Dumcsi.Backend.Services.External;

public class LiveKitService : ILiveKitService
{
    private readonly string _apiKey;
    private readonly string _apiSecret;
    private readonly string _serverUrl;

    public LiveKitService(IConfiguration configuration)
    {
        var liveKitConfig = configuration.GetSection("LiveKit");
        _apiKey = liveKitConfig["ApiKey"] ?? throw new InvalidOperationException("LiveKit ApiKey is not configured.");
        _apiSecret = liveKitConfig["ApiSecret"] ?? throw new InvalidOperationException("LiveKit ApiSecret is not configured.");
        _serverUrl = liveKitConfig["ServerUrl"] ?? throw new InvalidOperationException("LiveKit ServerUrl is not configured.");
    }

    public async Task<LiveKitTokenResponseDto> GenerateTokenAsync(LiveKitTokenRequestDto request)
    {
        var videoGrant = CreateVideoGrantClaims(request);

        var now = DateTime.UtcNow;
        var expiresAt = now.Add(request.TokenExpiration);

        var handler = new JsonWebTokenHandler();
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Issuer = _apiKey,
            Subject = new ClaimsIdentity(new[] { new Claim(JwtRegisteredClaimNames.Sub, request.ParticipantName) }),
            Expires = expiresAt,
            NotBefore = now,
            IssuedAt = now,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_apiSecret)),
                SecurityAlgorithms.HmacSha256),
            Claims = new Dictionary<string, object>
            {
                ["name"] = request.ParticipantName,
                ["video"] = videoGrant
            }
        };

        var tokenString = handler.CreateToken(tokenDescriptor);

        return await Task.FromResult(new LiveKitTokenResponseDto
        {
            Token = tokenString,
            ServerUrl = _serverUrl,
            ExpiresAt = expiresAt,
            RoomName = request.RoomName,
            ParticipantName = request.ParticipantName,
            Role = request.Role
        });
    }

    private IDictionary<string, object> CreateVideoGrantClaims(LiveKitTokenRequestDto request)
    {
        return request.Role switch
        {
            LiveKitParticipantRole.Subscriber => new Dictionary<string, object>
            {
                ["room"] = request.RoomName,
                ["roomJoin"] = true,
                ["canSubscribe"] = true,
                ["canPublish"] = false
            },

            LiveKitParticipantRole.Publisher => new Dictionary<string, object>
            {
                ["room"] = request.RoomName,
                ["roomJoin"] = true,
                ["canSubscribe"] = true,
                ["canPublish"] = true,
                ["canPublishData"] = true
            },

            LiveKitParticipantRole.Admin => new Dictionary<string, object>
            {
                ["room"] = request.RoomName,
                ["roomJoin"] = true,
                ["canSubscribe"] = true,
                ["canPublish"] = true,
                ["canPublishData"] = true,
                ["roomAdmin"] = true,
                ["roomCreate"] = true
            },

            _ => new Dictionary<string, object>
            {
                ["room"] = request.RoomName,
                ["roomJoin"] = true,
                ["canSubscribe"] = true,
                ["canPublish"] = false
            }
        };
    }
}