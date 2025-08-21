/**
 * =================================================================
 * KÖZÖS ALAP TÍPUSOK ÉS ENUMOK
 * =================================================================
 * Ezek a típusok a teljes alkalmazásban konzisztensek.
 */

export type EntityId = number;
export type ISODateString = string;

export enum ChannelType {
    Text = 0,
    Voice = 1
}

export enum UserStatus {
    Online = 'online',
    Idle = 'idle',
    Busy = 'busy',
    Offline = 'offline',
}

// A backend Permission enum-ja, ez a jogosultságkezelés alapja.
export enum Permission {
    None = 0,

    // Általános Szerver Jogosultságok
    ViewChannels = 1 << 0,       // Csatornák megtekintése
    ManageChannels = 1 << 1,      // Csatornák létrehozása, szerkesztése, törlése
    ManageRoles = 1 << 2,         // Szerepkörök kezelése
    ManageEmojis = 1 << 3,        // Emojik és matricák kezelése
    ViewAuditLog = 1 << 4,        // Audit napló megtekintése
    ManageServer = 1 << 5,        // Szerver nevének, régiójának stb. módosítása

    // Tagsággal kapcsolatos Jogosultságok
    CreateInvite = 1 << 6,        // Meghívó létrehozása
    KickMembers = 1 << 7,         // Tagok kirúgása
    BanMembers = 1 << 8,          // Tagok kitiltása

    // Üzenetküldéssel kapcsolatos Jogosultságok
    SendMessages = 1 << 9,        // Üzenetek küldése
    EmbedLinks = 1 << 10,         // Linkek beágyazása
    AttachFiles = 1 << 11,        // Fájlok csatolása
    AddReactions = 1 << 12,       // Reakciók hozzáadása
    UseExternalEmojis = 1 << 13, // Külső emojik használata
    MentionEveryone = 1 << 14,    // @everyone, @here és Minden Szerepkör megemlítése
    ManageMessages = 1 << 15,     // Mások üzeneteinek törlése
    ReadMessageHistory = 1 << 16, // Üzenetelőzmények olvasása

    // Hangcsatorna Jogosultságok
    Connect = 1 << 17,            // Csatlakozás hangcsatornához
    Speak = 1 << 18,              // Beszéd hangcsatornán
    MuteMembers = 1 << 19,        // Tagok némítása
    DeafenMembers = 1 << 20,      // Tagok süketítése
    MoveMembers = 1 << 21,        // Tagok mozgatása csatornák között

    // Adminisztrátori Jogosultság
    Administrator = 1 << 22       // Minden jogosultságot megad
}

/**
 * =================================================================
 * API VÁLASZ WRAPPER
 * =================================================================
 * Minden API hívás ezt a struktúrát követi.
 */
export interface ApiResponse<T = any> {
    isSuccess: boolean;
    data: T;
    message: string;
    error?: {
        code: string;
        message: string;
    };
}

/**
 * =================================================================
 * AUTHENTICATION TÍPUSOK
 * =================================================================
 */

// --- API Payloads (Request) ---
export interface LoginRequestDto {
    usernameOrEmail: string;
    password: string;
}

export interface RegisterRequestDto {
    username: string;
    password: string;
    email: string;
}

export interface RefreshTokenRequestDto {
    refreshToken: string;
}

// --- API Responses ---
export interface TokenResponseDto {
    accessToken: string;
    refreshToken: string;
}

// --- Frontend segédtípusok ---
export interface JwtPayload {
    sub: string;
    username: string;
    exp: number;
}

/**
 * =================================================================
 * USER TÍPUSOK
 * =================================================================
 */

// --- View Models (UI & Store számára) ---
export interface UserProfile {
    id: EntityId;
    username: string;
    globalNickname: string | null;
    avatarUrl: string | null;
}

export interface ServerMember {
    userId: EntityId;
    username: string;
    serverNickname: string | null;
    globalNickname: string | null;
    avatarUrl: string | null;
    roles: Role[];
    isOnline: boolean;
    status?: UserStatus;
}

// --- API Payloads (Request) ---
export interface UpdateUserProfileDto {
    username: string;
    email: string;
    globalNickname: string | null;
    avatar: string | null;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}

// --- API Responses (Nyers adatok a backendtől) ---
export interface UserProfileDto {
    id: EntityId;
    username: string;
    globalNickname: string | null;
    email: string;
    avatar: string | null;
    locale: string | null;
    verified: boolean | null;
}

export interface ServerMemberDto {
    userId: EntityId;
    username: string;
    globalNickname: string | null;
    serverNickname: string | null;
    avatar: string | null;
    roles: RoleDto[];
    joinedAt: ISODateString;
    deafened: boolean;
    muted: boolean;
}

/**
 * =================================================================
 * SERVER TÍPUSOK
 * =================================================================
 */

// --- View Models (UI & Store számára) ---
export interface ServerListItem {
    id: EntityId;
    name: string;
    icon: string | null;
    memberCount: number;
    isOwner: boolean;
    description: string | null;
    public: boolean;
    createdAt: ISODateString;
}

export interface ServerDetails extends ServerListItem {
    ownerId: EntityId;
    ownerUsername: string;
    currentUserPermissions: Permission;
    channels: ChannelListItem[];
    topics: TopicListItem[];
    roles: Role[];
}

// --- API Payloads (Request) ---
export interface CreateServerRequest {
    name: string;
    description?: string | null;
    public: boolean;
}

export interface UpdateServerRequest {
    name: string;
    description: string | null;
    public: boolean;
    icon: string | null;
}

export interface TransferOwnershipRequest {
    newOwnerId: EntityId;
}

// --- API Responses (Nyers adatok a backendtől) ---
export interface ServerListItemDto {
    id: EntityId;
    name: string;
    description: string | null;
    icon: string | null;
    memberCount: number;
    ownerId: EntityId;
    isOwner: boolean;
    public: boolean;
    createdAt: ISODateString;
}

export interface ServerDetailDto {
    id: EntityId;
    name: string;
    description: string | null;
    icon: string | null;
    ownerId: EntityId;
    ownerUsername: string;
    memberCount: number;
    isOwner: boolean;
    public: boolean;
    currentUserPermissions: Permission;
    createdAt: ISODateString;
    channels: ChannelListItemDto[];
    topics: TopicListItemDto[];
    roles: RoleDto[];
}

/**
 * =================================================================
 * CHANNEL TÍPUSOK
 * =================================================================
 */

// --- View Models (UI & Store számára) ---
export interface ChannelListItem {
    id: EntityId;
    serverId?: EntityId;
    topicId?: EntityId | null;
    name: string;
    type: ChannelType;
}

export interface ChannelDetails extends ChannelListItem {
    description: string | null;
}

// --- API Payloads (Request) ---
export interface CreateChannelRequest {
    name: string;
    description?: string | null;
    type: ChannelType;
    topicId?: EntityId | null;
}

export interface UpdateChannelRequest {
    name?: string | null;
    description?: string | null;
    position?: number | null;
    topicId?: EntityId | null;
}

// --- API Responses (Nyers adatok a backendtől) ---
export interface ChannelListItemDto {
    id: EntityId;
    serverId: EntityId;
    topicId: EntityId | null;
    name: string;
    type: ChannelType;
    position: number;
}

export interface ChannelDetailDto extends ChannelListItemDto {
    description: string | null;
    createdAt: ISODateString;
}

export interface TopicListItem {
    id: EntityId;
    serverId: EntityId;
    name: string;
    position: number;
    channels: ChannelListItem[];
}

export interface TopicListItemDto {
    id: EntityId;
    serverId: EntityId;
    name: string;
    position: number;
    channels: ChannelListItemDto[];
}

/**
 * =================================================================
 * MESSAGE TÍPUSOK
 * =================================================================
 */

// --- View Models (UI & Store számára) ---
export interface Message {
    id: EntityId;
    channelId: EntityId;
    author: UserProfile;
    content: string;
    timestamp: ISODateString;
    editedTimestamp: ISODateString | null;
    attachments: Attachment[];
    reactions: Reaction[];
}

export interface Attachment {
    id: EntityId;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string | null;
}

export interface Reaction {
    emojiId: string;
    count: number;
    isMine: boolean;
}

// --- API Payloads (Request) ---
export interface CreateMessageRequest {
    content: string;
    attachmentIds?: EntityId[];
    mentionedUserIds?: EntityId[];
    mentionedRoleIds?: EntityId[];
}

export interface UpdateMessageRequest {
    content: string;
}

// --- API Responses (Nyers adatok a backendtől) ---
export interface MessageDto {
    id: EntityId;
    channelId: EntityId;
    author: UserProfileDto;
    content: string;
    timestamp: ISODateString;
    editedTimestamp: ISODateString | null;
    tts: boolean;
    mentions: UserProfileDto[];
    mentionRoleIds: EntityId[];
    attachments: AttachmentDto[];
    reactions: ReactionDto[];
}

export interface AttachmentDto {
    id: EntityId;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string | null;
    height: number | null;
    width: number | null;
    duration: number | null;
    waveform: string | null;
}

export interface ReactionDto {
    emojiId: string;
    count: number;
    me: boolean;
}

/**
 * =================================================================
 * ROLE TÍPUSOK
 * =================================================================
 */

// --- View Models (UI & Store számára) ---
export interface Role {
    id: EntityId;
    name: string;
    color: string;
    position: number;
    permissions: Permission;
    isHoisted: boolean;
    isMentionable: boolean;
}

// --- API Responses (Nyers adatok a backendtől) ---
export interface RoleDto {
    id: EntityId;
    name: string;
    color: string;
    position: number;
    permissions: Permission;
    isHoisted: boolean;
    isMentionable: boolean;
}

/**
 * =================================================================
 * INVITE TÍPUSOK
 * =================================================================
 */

// --- View Model (UI & Store számára) ---
export interface InviteInfo {
    code: string;
    server: {
        id: EntityId;
        name: string;
        iconUrl: string | null;
        memberCount: number;
        description: string | null;
    };
}

// --- API Payload (Request) ---
export interface CreateInviteRequest {
    expiresInHours?: number | null;
    maxUses?: number;
    isTemporary?: boolean;
    channelId?: EntityId;
}

// --- API Responses ---
export interface InviteInfoDto {
    code: string;
    server: {
        id: EntityId;
        name: string;
        icon: string | null;
        memberCount: number;
        description: string | null;
    };
}

export interface CreateInviteResponse {
    code: string;
    expiresInHours?: number | null;
    maxUses: number;
    isTemporary: boolean;
    createdAt: ISODateString;
    expiresAt: ISODateString | null;
}

export interface InviteDto {
    code: string;
    serverId: EntityId;
    channelId: EntityId | null;
    channelName: string | null;
    creatorId: EntityId;
    creatorUsername: string;
    creatorAvatar: string | null;
    maxUses: number;
    currentUses: number;
    expiresAt: ISODateString | null;
    isTemporary: boolean;
    createdAt: ISODateString;
    isExpired: boolean;
    isMaxUsesReached: boolean;
}

/**
 * =================================================================
 * SIGNALR EVENT PAYLOADS
 * =================================================================
 * Ezek a típusok írják le a valós idejű események adatstruktúráját.
 */

export interface MessageDeletedPayload {
    messageId: EntityId;
    channelId: EntityId;
}

export interface UserServerPayload {
    userId: EntityId;
    serverId: EntityId;
    serverName?: string;
    user?: UserProfileDto;
    reason?: string;
}

export interface ChannelDeletedPayload {
    channelId: EntityId;
    serverId: EntityId;
}

export interface ReactionPayload {
    channelId: EntityId;
    messageId: EntityId;
    emojiId: string;
    userId: EntityId;
}


export interface UserTypingPayload {
    channelId: EntityId;
    userId: EntityId;
}

/**
 * =================================================================
 * UPLOAD TÍPUSOK
 * =================================================================
 */

export interface UploadResponse {
    id: EntityId;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    contentType: string;
}

export interface UploadOptions {
    onProgress?: (progress: number) => void;
}

/**
 * =================================================================
 * JOIN SERVER RESPONSE
 * =================================================================
 */

export interface JoinServerResponse {
    serverId: EntityId;
}

/**
 * =================================================================
 * FRIEND & DIRECT MESSAGE TYPES
 * =================================================================
 */

export enum DmFilterOption {
    AllowAll = 0,
    FriendsOnly = 1,
    AllRequests = 2,
}

export interface FriendListItem {
    userId: EntityId;
    username: string;
    online: boolean;
}

export interface FriendRequestItem {
    requestId: EntityId;
    fromUserId: EntityId;
    fromUsername: string;
}

export interface DmSettings {
    filter: DmFilterOption;
}

export interface DmRequestItem {
    id: EntityId;
    fromUserId: EntityId;
    fromUsername: string;
    initialMessage: string;
}

export interface DmMessageDto {
    id: EntityId;
    senderId: EntityId;
    receiverId: EntityId;
    sender: UserProfileDto;
    content: string;
    timestamp: ISODateString;
    editedTimestamp: ISODateString | null;
}

export interface SendDmMessageRequest {
    content: string;
}

export interface ConversationListItemDto {
    userId: EntityId;
    username: string;
    lastMessage: string | null;
    lastTimestamp: ISODateString | null;
}
