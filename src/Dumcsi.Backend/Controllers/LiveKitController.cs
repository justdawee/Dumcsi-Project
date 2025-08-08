using Dumcsi.Backend.Common;
using Dumcsi.Backend.Models.DTOs;
using Dumcsi.Backend.Services.External;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dumcsi.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LiveKitController(ILiveKitService liveKitService) : ControllerBase
{
    /// <summary>
    /// Generates a LiveKit access token for joining a room
    /// </summary>
    /// <param name="request">Token generation request containing room name, participant name, and role</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>LiveKit access token and connection details</returns>
    [HttpPost("token")]
    public async Task<IActionResult> GenerateToken([FromBody] LiveKitControllerModels.GenerateTokenRequestDto request, CancellationToken cancellationToken)
    {
        try
        {
            var serviceRequest = new LiveKitTokenRequestDto
            {
                RoomName = request.RoomName,
                ParticipantName = request.ParticipantName,
                Role = request.Role,
                TokenExpiration = TimeSpan.FromMinutes(request.TokenExpirationMinutes)
            };

            var result = await liveKitService.GenerateTokenAsync(serviceRequest);

            return Ok(ApiResponse<LiveKitTokenResponseDto>.Success(result));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse.Fail("LIVEKIT_TOKEN_GENERATION_FAILED", $"Failed to generate LiveKit token: {ex.Message}"));
        }
    }

    /// <summary>
    /// Gets LiveKit server information
    /// </summary>
    /// <returns>LiveKit server connection details</returns>
    [HttpGet("server-info")]
    public IActionResult GetServerInfo()
    {
        // This endpoint can be used to get server info without generating a token
        // Useful for client-side validation or configuration
        return Ok(ApiResponse.Success("LiveKit server is available"));
    }
}