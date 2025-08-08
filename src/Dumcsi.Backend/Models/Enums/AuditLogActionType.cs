namespace Dumcsi.Backend.Models.Enums;

public enum AuditLogActionType
{
    // Server operations
    ServerCreated,
    ServerUpdated,
    ServerDeleted,
    ServerOwnershipTransferred,
    ServerMemberJoined,
    ServerMemberLeft,

    // Role operations
    RoleCreated,
    RoleUpdated,
    RoleDeleted,
    MemberRolesUpdated,

    // Channel operations
    ChannelCreated,
    ChannelUpdated,
    ChannelDeleted,
    
    // Topic operations
    TopicCreated,
    TopicUpdated,
    TopicDeleted,

    // Member operations
    MemberKicked,
    MemberBanned,

    // Invite operations
    InviteCreated,
    InviteDeleted,
    
    // Message operations
    MessageDeleted,
    MessageEdited,
    
    // Emoji operations
    EmojiCreated,
    EmojiUpdated,
    EmojiDeleted,
    
}
