namespace Dumcsi.Backend.Models.Entities;

public class Reaction
{
    public long MessageId { get; set; }
    
    public required Message Message { get; set; }

    public long UserId { get; set; }
    
    public required User User { get; set; }

    public required string EmojiId { get; set; }
}
