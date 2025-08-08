namespace Dumcsi.Backend.Models.Enums;

[Flags]
public enum Permission : long
{
    None = 0,

    // General Server Permissions
    ViewChannels = 1L << 0,
    ManageChannels = 1L << 1,
    ManageRoles = 1L << 2,
    ManageEmojis = 1L << 3,
    ViewAuditLog = 1L << 4,
    ManageServer = 1L << 5,
    
    // Membership Permissions
    CreateInvite = 1L << 6,
    KickMembers = 1L << 7,
    BanMembers = 1L << 8,
    
    // Message Permissions
    SendMessages = 1L << 9,
    EmbedLinks = 1L << 10,
    AttachFiles = 1L << 11,
    AddReactions = 1L << 12,
    UseExternalEmojis = 1L << 13,
    MentionEveryone = 1L << 14,
    ManageMessages = 1L << 15,
    ReadMessageHistory = 1L << 16,

    // Voice Channel Permissions
    Connect = 1L << 17,
    Speak = 1L << 18,
    MuteMembers = 1L << 19,
    DeafenMembers = 1L << 20,
    MoveMembers = 1L << 21,

    // Administrator Permission
    Administrator = 1L << 22
}