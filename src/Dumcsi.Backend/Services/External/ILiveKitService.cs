using Dumcsi.Backend.Models.DTOs;

namespace Dumcsi.Backend.Services.External;

public interface ILiveKitService
{
    Task<LiveKitTokenResponseDto> GenerateTokenAsync(LiveKitTokenRequestDto request);
}