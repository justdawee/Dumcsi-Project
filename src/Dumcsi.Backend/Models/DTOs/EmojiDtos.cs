using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Backend.Models.DTOs;

public class EmojiDtos
{
    // Response DTO
    public class EmojiDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
    }

    // Request DTO
    public class CreateEmojiRequestDto
    {
        [Required]
        [RegularExpression("^[a-zA-Z0-9_]{2,50}$")]
        public string Name { get; set; } = string.Empty;
        [Required]
        [Url]
        public string ImageUrl { get; set; } = string.Empty;
    }
    
    // Update DTO
    public class UpdateEmojiRequestDto
    {
        [Required]
        [RegularExpression("^[a-zA-Z0-9_]{2,50}$")]
        public string Name { get; set; } = string.Empty;
    }
}
