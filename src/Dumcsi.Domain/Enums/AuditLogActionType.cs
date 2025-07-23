namespace Dumcsi.Domain.Enums;

public enum AuditLogActionType
{
    // Szerver műveletek
    ServerCreated,
    ServerUpdated,
    ServerDeleted,
    ServerOwnershipTransferred,
    ServerMemberJoined,
    ServerMemberLeft,

    // Szerepkör műveletek
    RoleCreated,
    RoleUpdated,
    RoleDeleted,
    MemberRolesUpdated,

    // Csatorna műveletek
    ChannelCreated,
    ChannelUpdated,
    ChannelDeleted,

    // Tag műveletek
    MemberKicked,
    MemberBanned,

    // Meghívó műveletek
    InviteCreated,
    InviteDeleted,
    
    // Üzenet műveletek
    MessageDeleted,
    MessageEdited,
    
    // Emoji műveletek
    EmojiCreated,
    EmojiUpdated,
    EmojiDeleted,
    
}