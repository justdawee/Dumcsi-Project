using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Backend.Models.DTOs;

public class LiveKitTokenRequestDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public required string RoomName { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public required string ParticipantName { get; set; }

    public LiveKitParticipantRole Role { get; set; } = LiveKitParticipantRole.Subscriber;

    public TimeSpan TokenExpiration { get; set; } = TimeSpan.FromHours(6);
}

public class LiveKitTokenResponseDto
{
    public required string Token { get; set; }
    public required string ServerUrl { get; set; }
    public DateTime ExpiresAt { get; set; }
    public required string RoomName { get; set; }
    public required string ParticipantName { get; set; }
    public LiveKitParticipantRole Role { get; set; }
}

public enum LiveKitParticipantRole
{
    Subscriber = 0,
    Publisher = 1,
    Admin = 2
}

public static class LiveKitControllerModels
{
    public record GenerateTokenRequestDto
    {
        [Required]
        [StringLength(100, MinimumLength = 1)]
        public required string RoomName { get; init; }

        [Required]
        [StringLength(100, MinimumLength = 1)]
        public required string ParticipantName { get; init; }

        public LiveKitParticipantRole Role { get; init; } = LiveKitParticipantRole.Subscriber;

        public int TokenExpirationMinutes { get; init; } = 360; // 6 hours default
    }
}