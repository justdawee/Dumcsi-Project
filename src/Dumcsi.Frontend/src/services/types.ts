// --- Enums ---
export enum Role { 
  Member = 0, 
  Moderator = 1, 
  Admin = 2 
}

export enum ChannelType { 
  Text = 0, 
  Voice = 1 
}

export enum ModerationStatus { 
  Visible = 0, 
  UserDeleted = 1, 
  ModeratedRemoved = 2 
}

// --- Type Aliases for Clarity ---

/** A string representation of a date in ISO 8601 format (e.g., "2023-10-27T10:00:00Z"). */
export type ISODateString = string;

export type EntityId = number;

// --- DTOs / Interfaces ---

// User & Auth
export interface UserProfile {
  id: EntityId;
  username: string;
  email: string;
  globalNickname?: string;
  avatarUrl?: string;
  profilePictureUrl?: string; // Legacy support
  isOnline?: boolean;
  lastSeenAt?: ISODateString;
}

export interface UserDto {
  id: EntityId;
  username: string;
  globalNickname?: string;
  avatarUrl?: string;
  isOnline: boolean;
}

export interface UserSearchResult {
  id: EntityId;
  username: string;
  globalNickname?: string;
  avatarUrl?: string;
  isOnline: boolean;
}

// Server
export interface ServerListItem {
  id: EntityId;
  name: string;
  description: string;
  iconUrl?: string;
  memberCount: number;
  ownerId: EntityId;
  isOwner: boolean;
  memberLimit: number;
  isPublic: boolean;
  createdAt: ISODateString;
}

export interface ServerDetail extends ServerListItem {
  ownerUsername: string;
  currentUserRole: Role;
  channels: ChannelListItem[];
  roles?: RoleDto[];
  emojis?: EmojiDto[];
}

export interface ServerDto {
  id: EntityId;
  name: string;
  description?: string;
  iconUrl?: string;
  memberCount: number;
  isPublic: boolean;
}

export interface ServerMember {
  userId: EntityId;
  username: string;
  globalNickname?: string;
  profilePictureUrl?: string;
  avatarUrl?: string;
  role: Role;
  roles?: EntityId[]; // Role IDs
  joinedAt: ISODateString;
  isOnline?: boolean;
}

// Channel
export interface ChannelListItem {
  id: EntityId;
  name: string;
  description?: string;
  type: ChannelType;
  position: number;
  createdAt: ISODateString;
}

export interface ChannelDetail extends ChannelListItem {
  messages: MessageListItem[];
  serverId: EntityId;
}

export interface ChannelDto {
  id: EntityId;
  serverId: EntityId;
  name: string;
  description?: string;
  type: ChannelType;
  position: number;
}

// Message
export interface MessageListItem {
  id: EntityId;
  content: string;
  senderId: EntityId;
  senderUsername: string;
  senderGlobalNickname?: string;
  senderAvatarUrl?: string;
  moderationStatus: ModerationStatus;
  createdAt: ISODateString;
  editedAt?: ISODateString;
  channelId?: EntityId;
  attachments?: AttachmentDto[];
  reactions?: ReactionDto[];
  mentionedUsers?: UserDto[];
  mentionedRoles?: RoleDto[];
}

export interface MessageDto extends MessageListItem {
  channelId: EntityId;
}

// Attachments
export interface AttachmentDto {
  id: EntityId;
  filename: string;
  url: string;
  size: number;
  contentType: string;
}

// Reactions
export interface ReactionDto {
  emojiId?: EntityId;
  emoji?: string; // Unicode emoji
  count: number;
  users: UserDto[];
  hasReacted: boolean; // Current user has reacted
}

// Roles
export interface RoleDto {
  id: EntityId;
  serverId: EntityId;
  name: string;
  color: string;
  permissions: string[];
  position: number;
  isMentionable: boolean;
}

// Emojis
export interface EmojiDto {
  id: EntityId;
  serverId: EntityId;
  name: string;
  url: string;
  createdBy: EntityId;
  createdAt: ISODateString;
}

// --- Payloads ---
export interface LoginPayload {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
  globalNickname?: string;
  avatarUrl?: string;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface CreateServerPayload {
  name: string;
  description?: string;
  isPublic: boolean;
  iconUrl?: string;
}

export interface UpdateServerPayload {
  name: string;
  description?: string;
  iconUrl?: string;
  isPublic: boolean;
}

export interface JoinServerPayload {
  inviteCode: string;
}

// --- API Responses ---
export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface InviteResponse {
  inviteCode: string;
  message: string;
}

export interface JoinServerResponse {
  message: string;
  serverName: string;
  serverId: EntityId;
}

// File Upload Responses
export interface UploadResponse {
  url: string;
  filename?: string;
  size?: number;
  contentType?: string;
}

// --- Channel Payloads ---
export interface CreateChannelPayload {
  name: string;
  description?: string;
  type: ChannelType;
}

export interface UpdateChannelPayload {
  name: string;
  description?: string;
  position: number;
}

// --- Message Payloads ---
export interface CreateMessagePayload {
  content: string;
  attachmentUrls?: string[];
  mentionedUserIds?: EntityId[];
  mentionedRoleIds?: EntityId[];
}

export interface UpdateMessagePayload {
  content: string;
}

// --- SignalR Event Payloads ---
export interface MessageDeletedPayload {
  channelId: EntityId;
  messageId: EntityId;
}

export interface UserServerPayload {
  serverId: EntityId;
  userId: EntityId;
  user?: UserDto;
}

export interface ChannelDeletedPayload {
  serverId: EntityId;
  channelId: EntityId;
}

export interface EmojiDeletedPayload {
  serverId: EntityId;
  emojiId: EntityId;
}

export interface MemberRolesUpdatedPayload {
  serverId: EntityId;
  userId: EntityId;
  roleIds: EntityId[];
}

export interface ReactionPayload {
  messageId: EntityId;
  channelId: EntityId;
  userId: EntityId;
  emojiId?: EntityId;
  emoji?: string;
}

// --- WebRTC Payloads ---
export interface VoiceChannelPayload {
  channelId: EntityId;
  userId: EntityId;
  user?: UserDto;
}

export interface WebRTCSignalPayload {
  fromUserId: EntityId;
  toUserId: EntityId;
  signal: any; // RTCSessionDescription or RTCIceCandidate
}

export interface ScreenSharePayload {
  channelId: EntityId;
  userId: EntityId;
  isSharing: boolean;
}

// --- Audit Log ---
export interface AuditLogEntry {
  id: EntityId;
  serverId: EntityId;
  userId: EntityId;
  username: string;
  action: string;
  targetType?: string;
  targetId?: EntityId;
  changes?: Record<string, any>;
  createdAt: ISODateString;
}