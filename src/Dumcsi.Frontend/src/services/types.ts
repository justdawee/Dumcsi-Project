// --- Enums (from backend) ---
export enum Permission {
  None = 0,
  ViewChannels = 1 << 0,
  ManageChannels = 1 << 1,
  ManageRoles = 1 << 2,
  ManageServer = 1 << 3,
  CreateInvite = 1 << 4,
  ChangeNickname = 1 << 5,
  ManageNicknames = 1 << 6,
  KickMembers = 1 << 7,
  BanMembers = 1 << 8,
  SendMessages = 1 << 9,
  EmbedLinks = 1 << 10,
  AttachFiles = 1 << 11,
  AddReactions = 1 << 12,
  UseExternalEmojis = 1 << 13,
  MentionEveryone = 1 << 14,
  ManageMessages = 1 << 15,
  ReadMessageHistory = 1 << 16,
  SendTTSMessages = 1 << 17,
  UseVoice = 1 << 18,
  ManageEmojis = 1 << 19,
  ViewAuditLog = 1 << 20,
  Administrator = 1 << 31
}

export enum ChannelType {
  Text = 0,
  Voice = 1
}

export enum AuditLogTargetType {
  Server = 0,
  Channel = 1,
  User = 2,
  Role = 3,
  Invite = 4,
  Message = 5,
  Emoji = 6
}

export enum AuditLogActionType {
  // Server actions
  ServerCreated = 0,
  ServerUpdated = 1,
  ServerDeleted = 2,
  
  // Channel actions
  ChannelCreated = 10,
  ChannelUpdated = 11,
  ChannelDeleted = 12,
  
  // Member actions
  ServerMemberJoined = 20,
  ServerMemberLeft = 21,
  ServerMemberKicked = 22,
  ServerMemberBanned = 23,
  ServerMemberUnbanned = 24,
  ServerMemberRolesUpdated = 25,
  
  // Role actions
  RoleCreated = 30,
  RoleUpdated = 31,
  RoleDeleted = 32,
  
  // Message actions
  MessageDeleted = 40,
  MessageBulkDeleted = 41,
  
  // Emoji actions
  EmojiCreated = 50,
  EmojiUpdated = 51,
  EmojiDeleted = 52,
  
  // Invite actions
  InviteCreated = 60,
  InviteDeleted = 61
}

// --- Type Aliases ---
export type EntityId = number; // Backend uses long, which maps to number in TS
export type ISODateString = string; // For Instant type from backend

// --- Auth DTOs ---
export interface RegisterRequestDto {
  username: string;
  password: string;
  email: string;
}

export interface LoginRequestDto {
  usernameOrEmail: string;
  password: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
}

// --- Result DTOs ---
export interface Result {
  isSuccess: boolean;
  error: string | null;
  isFailure?: boolean;
}

export interface ResultT<T> extends Result {
  value: T | null;
}

// --- User DTOs ---
export interface UserProfileDto {
  id: EntityId;
  username: string;
  globalNickname: string | null;
  email: string;
  avatar: string | null;
  locale: string | null;
  verified: boolean | null;
}

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

// --- Server DTOs ---
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

export interface CreateServerRequestDto {
  name: string;
  description?: string | null;
  public: boolean;
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
  roles: RoleDto[];
}

export interface ServerMemberDto {
  userId: EntityId;
  username: string;
  serverNickname: string | null;
  avatar: string | null;
  roles: RoleDto[];
  joinedAt: ISODateString;
  deafened: boolean;
  muted: boolean;
}

export interface UpdateServerRequestDto {
  name: string;
  description: string | null;
  public: boolean;
  icon: string | null;
}

export interface RoleDto {
  id: EntityId;
  name: string;
  color: string;
  position: number;
  permissions: Permission;
  isHoisted: boolean;
  isMentionable: boolean;
}

export interface UserServerPayload {
  user: UserProfileDto;
  serverId: EntityId;
}

// --- Channel DTOs ---
export interface ChannelListItemDto {
  id: EntityId;
  name: string;
  type: ChannelType;
  position: number;
}

export interface CreateChannelRequestDto {
  name: string;
  description?: string | null;
  type: ChannelType;
}

export interface ChannelDetailDto extends ChannelListItemDto {
  description: string | null;
  createdAt: ISODateString;
}

export interface UpdateChannelRequestDto {
  name?: string | null;
  description?: string | null;
  position?: number | null;
}

export interface ChannelDeletedPayload {
  serverId: EntityId;
  channelId: EntityId;
}

// --- Message DTOs ---
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

export interface CreateMessageRequestDto {
  content: string;
  tts?: boolean;
  attachmentIds?: EntityId[] | null;
  mentionedUserIds?: EntityId[] | null;
  mentionedRoleIds?: EntityId[] | null;
}

// might not work with backend -> backend uses MapMessageToDto function
export interface UpdateMessageRequestDto {
  content: string;
}

export interface MessageDeletedPayload {
  channelId: EntityId;
  messageId: EntityId;
}

export interface ReactionDto {
  emojiId: string;
  count: number;
  me: boolean;
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

// --- Role DTOs ---
export interface CreateRoleRequestDto {
  name: string;
  color?: string;
  permissions?: Permission;
  isHoisted?: boolean;
  isMentionable?: boolean;
}

export interface UpdateRoleRequestDto {
  name?: string | null;
  color?: string | null;
  permissions?: Permission | null;
  position?: number | null;
  isHoisted?: boolean | null;
  isMentionable?: boolean | null;
}

export interface UpdateMemberRolesRequestDto {
  roleIds: EntityId[];
}

// --- Invite DTOs ---
export interface CreateInviteRequestDto {
  expiresInHours?: number | null;
  maxUses?: number;
  isTemporary?: boolean;
}

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

// --- Emoji DTOs ---
export interface EmojiDto {
  id: EntityId;
  name: string;
  imageUrl: string;
}

export interface CreateEmojiRequestDto {
  name: string;
  imageUrl: string;
}

export interface UpdateEmojiRequestDto {
  name: string;
}

// --- Audit Log DTOs ---
export interface AuditLogEntryDto {
  id: EntityId;
  executorId: EntityId;
  executorUsername: string;
  targetId: EntityId | null;
  targetType: AuditLogTargetType | null;
  actionType: AuditLogActionType;
  changes: string | null; // JSON string from backend
  reason: string | null;
  createdAt: ISODateString;
}

// --- API Response Wrapper ---
export interface ApiResponse<T = any> {
  isSuccess: boolean;
  data: T;
  message: string;
}

// --- Additional types for frontend usage ---
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  exp: number;
}

export interface UserSearchResult {
  id: EntityId;
  username: string;
  globalNickname: string | null;
  avatar: string | null;
}