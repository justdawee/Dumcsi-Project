using Dumcsi.Backend.Models.DTOs;
using Microsoft.Extensions.Configuration;
using Livekit.Server.Sdk.Dotnet;

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
        // Create video grants based on role using official LiveKit SDK
        var videoGrants = CreateVideoGrants(request);

        // Use the official LiveKit SDK
        var accessToken = new AccessToken(_apiKey, _apiSecret)
            .WithIdentity(request.ParticipantName)
            .WithName(request.ParticipantName)
            .WithGrants(videoGrants)
            .WithTtl(request.TokenExpiration);

        var tokenString = accessToken.ToJwt();
        var expiresAt = DateTime.UtcNow.Add(request.TokenExpiration);

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

    private VideoGrants CreateVideoGrants(LiveKitTokenRequestDto request)
    {
        return request.Role switch
        {
            LiveKitParticipantRole.Subscriber => new VideoGrants
            {
                Room = request.RoomName,
                RoomJoin = true,
                CanSubscribe = true,
                CanPublish = false
            },
            
            LiveKitParticipantRole.Publisher => new VideoGrants
            {
                Room = request.RoomName,
                RoomJoin = true,
                CanSubscribe = true,
                CanPublish = true,
                CanPublishData = true
            },
            
            LiveKitParticipantRole.Admin => new VideoGrants
            {
                Room = request.RoomName,
                RoomJoin = true,
                CanSubscribe = true,
                CanPublish = true,
                CanPublishData = true,
                RoomAdmin = true,
                RoomCreate = true
            },

            _ => new VideoGrants
            {
                Room = request.RoomName,
                RoomJoin = true,
                CanSubscribe = true,
                CanPublish = false
            }
        };
    }
}