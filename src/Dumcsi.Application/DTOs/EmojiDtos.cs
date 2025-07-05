using System.ComponentModel.DataAnnotations;

namespace Dumcsi.Application.DTOs;

public class EmojiDtos
{
    // Válasz DTO
    public class EmojiDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty; // Változhat, jövőben saját fájltárolás
    }

    // Kérés DTO
    public class CreateEmojiRequestDto
    {
        [Required]
        [RegularExpression("^[a-zA-Z0-9_]{2,50}$")] // Név validáció
        public string Name { get; set; } = string.Empty;
        [Required]
        [Url]
        public string ImageUrl { get; set; } = string.Empty; // Változhat, jövőben saját fájltárolás
    }
    
    // Frissítés DTO
    public class UpdateEmojiRequestDto
    {
        [Required]
        [RegularExpression("^[a-zA-Z0-9_]{2,50}$")] // Név validáció
        public string Name { get; set; } = string.Empty;
    }
}