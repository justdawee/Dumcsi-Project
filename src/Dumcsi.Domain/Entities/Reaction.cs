namespace Dumcsi.Domain.Entities;

public class Reaction
{
    public long MessageId { get; set; }
    
    public required Message Message { get; set; }

    public long UserId { get; set; }
    
    public required User User { get; set; }

    // Unicode emoji vagy ":custom_emoji_name:id" formátum
    public required string EmojiId { get; set; }
}