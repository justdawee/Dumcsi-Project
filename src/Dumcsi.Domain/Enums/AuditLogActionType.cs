namespace Dumcsi.Domain.Enums;

public enum AuditLogActionType
{
    // Szerver műveletek
    ServerUpdated,

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
    InviteDeleted
}