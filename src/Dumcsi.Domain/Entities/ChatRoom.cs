using NodaTime;

namespace Dumcsi.Domain.Entities;

public class ChatRoom
{
    public long Id { get; set; }
    
    public required string Name { get; set; }

    public string? Description { get; set; }
    
    public string? IconUrl { get; set; }

    public long CreatorId { get; set; }
    
    public required User Creator { get; set; }

    public Instant CreatedAt { get; set; }
    
    public Instant UpdatedAt { get; set; }
    
    public ICollection<RoomParticipant> Participants { get; set; } = new List<RoomParticipant>();
    
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}