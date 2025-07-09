// Core types
export type EntityId = number
export type ISODateString = string

// Enums from backend
export enum Permission {
  None = 0,
  ViewChannels = 1 << 0,
  SendMessages = 1 << 1,
  ManageMessages = 1 << 2,
  MentionEveryone = 1 << 3,
  AttachFiles = 1 << 4,
  ViewAuditLog = 1 << 5,
  ManageChannels = 1 << 6,
  ManageServer = 1 << 7,
  KickMembers = 1 << 8,
  BanMembers = 1 << 9,
  ManageRoles = 1 << 10,
  Administrator = 1 << 11,
}

export enum ChannelType {
  Text = 0,
  Voice = 1,
}

export enum AuditLogActionType {
  ServerCreated = 1,
  ServerUpdated = 2,
  ServerDeleted = 3,
  ChannelCreated = 10,
  ChannelUpdated = 11,
  ChannelDeleted = 12,
  MessageDeleted = 20,
  MemberJoined = 30,
  MemberLeft = 31,
  MemberKicked = 32,
  MemberBanned = 33,
  MemberRoleUpdated = 34,
  RoleCreated = 40,
  RoleUpdated = 41,
  RoleDeleted = 42,
  EmojiCreated = 50,
  EmojiUpdated = 51,
  EmojiDeleted = 52,
}

export enum AuditLogTargetType {
  Server = 1,
  Channel = 2,
  User = 3,
  Role = 4,
  Message = 5,
  Emoji = 6,
}

// API Response wrapper
export interface ApiResponse<T = any> {
  isSuccess: boolean
  data: T
  message: string
}

// Auth DTOs
export interface RegisterRequestDto {
  username: string
  password: string
  email: string
}

export interface LoginRequestDto {
  usernameOrEmail: string
  password: string
}

export interface RefreshTokenRequestDto {
  refreshToken: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
}

export interface JwtPayload {
  sub: string
  username: string
  exp: number
}

// User DTOs
export interface UserProfileDto {
  id: EntityId
  username: string
  globalNickname: string | null
  email: string
  avatar: string | null
  locale: string | null
  verified: boolean | null
}

export interface UpdateUserProfileDto {
  username: string
  email: string
  globalNickname: string | null
  avatar: string | null
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

// Server DTOs
export interface ServerListItemDto {
  id: EntityId
  name: string
  description: string | null
  icon: string | null
  memberCount: number
  ownerId: EntityId
  isOwner: boolean
  public: boolean
  createdAt: ISODateString
}

export interface CreateServerRequestDto {
  name: string
  description?: string | null
  public: boolean
}

export interface ServerDetailDto {
  id: EntityId
  name: string
  description: string | null
  icon: string | null
  ownerId: EntityId
  ownerUsername: string
  memberCount: number
  isOwner: boolean
  public: boolean
  currentUserPermissions: Permission
  createdAt: ISODateString
  channels: ChannelListItemDto[]
  roles: RoleDto[]
}

export interface ServerMemberDto {
  userId: EntityId
  username: string
  serverNickname: string | null
  avatar: string | null
  roles: RoleDto[]
  joinedAt: ISODateString
  deafened: boolean
  muted: boolean
}

export interface UpdateServerRequestDto {
  name: string
  description: string | null
  public: boolean
  icon: string | null
}

export interface RoleDto {
  id: EntityId
  name: string
  color: string
  position: number
  permissions: Permission
  isHoisted: boolean
  isMentionable: boolean
}

// Channel DTOs
export interface ChannelListItemDto {
  id: EntityId
  name: string
  type: ChannelType
  position: number
}

export interface CreateChannelRequestDto {
  name: string
  description?: string | null
  type: ChannelType
}

export interface ChannelDetailDto extends ChannelListItemDto {
  description: string | null
  createdAt: ISODateString
}

export interface UpdateChannelRequestDto {
  name?: string | null
  description?: string | null
  position?: number | null
}

// Message DTOs
export interface MessageDto {
  id: EntityId
  channelId: EntityId
  author: UserProfileDto
  content: string
  timestamp: ISODateString
  editedTimestamp: ISODateString | null
  tts: boolean
  mentions: UserProfileDto[]
  mentionRoleIds: EntityId[]
  attachments: AttachmentDto[]
  reactions: ReactionDto[]
}

export interface CreateMessageRequestDto {
  content: string
  tts?: boolean
  attachmentIds?: EntityId[] | null
  mentionedUserIds?: EntityId[] | null
  mentionedRoleIds?: EntityId[] | null
}

export interface UpdateMessageRequestDto {
  content: string
}

export interface ReactionDto {
  emojiId: string
  count: number
  me: boolean
}

export interface AttachmentDto {
  id: EntityId
  fileName: string
  fileUrl: string
  fileSize: number
  contentType: string | null
  height: number | null
  width: number | null
  duration: number | null
  waveform: string | null
}

// Role DTOs
export interface CreateRoleRequestDto {
  name: string
  color?: string
  permissions?: Permission
  isHoisted?: boolean
  isMentionable?: boolean
}

export interface UpdateRoleRequestDto {
  name?: string | null
  color?: string | null
  permissions?: Permission | null
  position?: number | null
  isHoisted?: boolean | null
  isMentionable?: boolean | null
}

export interface UpdateMemberRolesRequestDto {
  roleIds: EntityId[]
}

// Invite DTOs
export interface CreateInviteRequestDto {
  expiresInHours?: number | null
  maxUses?: number
  isTemporary?: boolean
}

export interface InviteInfoDto {
  code: string
  server: {
    id: EntityId
    name: string
    icon: string | null
    memberCount: number
    description: string | null
  }
}

// Emoji DTOs
export interface EmojiDto {
  id: EntityId
  name: string
  imageUrl: string
}

export interface CreateEmojiRequestDto {
  name: string
  imageUrl: string
}

export interface UpdateEmojiRequestDto {
  name: string
}

// Audit Log DTOs
export interface AuditLogEntryDto {
  id: EntityId
  executorId: EntityId
  executorUsername: string
  targetId: EntityId | null
  targetType: AuditLogTargetType | null
  actionType: AuditLogActionType
  changes: string | null
  reason: string | null
  createdAt: ISODateString
}

// SignalR event payloads
export interface MessageDeletedPayload {
  messageId: EntityId
  channelId: EntityId
}

export interface UserServerPayload {
  userId: EntityId
  serverId: EntityId
  serverName?: string
}

export interface ChannelDeletedPayload {
  channelId: EntityId
  serverId: EntityId
}

export interface UserTypingPayload {
  userId: EntityId
  channelId: EntityId
  username: string
}

// Toast notification types
export interface Toast {
  id: string
  type: 'success' | 'danger' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

// Loading states
export interface LoadingStates {
  servers: boolean
  messages: boolean
  members: boolean
  channels: boolean
  auth: boolean
}

// Frontend-specific types
export interface ServerStore extends ServerDetailDto {
  // Local state enhancements
}

export interface ChannelStore extends ChannelDetailDto {
  // Local state enhancements
}

export type UserDto = UserProfileDto