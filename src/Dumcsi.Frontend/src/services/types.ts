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

// A backend Permission enum-ja, ez a jogosultságkezelés alapja.
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
  avatarUrl: string | null;
  roles: Role[];
  isOnline: boolean;
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
}

export interface ServerDetails extends ServerListItem {
  ownerId: EntityId;
  permissions: Permission;
  channels: ChannelListItem[];
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
}

export interface UpdateChannelRequest {
  name?: string | null;
  description?: string | null;
  position?: number | null;
}

// --- API Responses (Nyers adatok a backendtől) ---
export interface ChannelListItemDto {
  id: EntityId;
  serverId: EntityId;
  name: string;
  type: ChannelType;
  position: number;
}

export interface ChannelDetailDto extends ChannelListItemDto {
  description: string | null;
  createdAt: ISODateString;
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
  expiresAt: ISODateString | null;
  maxUses: number | null;
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
}

export interface ChannelDeletedPayload {
  channelId: EntityId;
  serverId: EntityId;
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