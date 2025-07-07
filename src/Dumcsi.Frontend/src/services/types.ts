// Entity ID type
export type EntityId = number;

// Enums
export enum Role {
  Member = 0,
  Moderator = 1,
  Admin = 2
}

export enum ChannelType {
  Text = 0,
  Voice = 1
}

// Auth Types
export interface LoginPayload {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  email?: string;
  profilePictureUrl?: string;
  globalNickname?: string;
  exp: number;
  iat: number;
}

// User Types
export interface UserDto {
  id: EntityId;
  username: string;
  email?: string;
  profilePictureUrl?: string;
  globalNickname?: string;
  createdAt?: string;
}

export interface UserProfile {
  id: EntityId;
  username: string;
  email: string;
  profilePictureUrl?: string;
  globalNickname?: string;
  createdAt?: string;
}

export interface UserSearchResult {
  id: EntityId;
  username: string;
  globalNickname?: string;
  profilePictureUrl?: string;
}

export interface UpdateProfilePayload {
  globalNickname?: string | null;
  avatarUrl?: string | null;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// Server Types
export interface ServerDto {
  id: EntityId;
  name: string;
  description?: string;
  iconUrl?: string;
  ownerId: EntityId;
  inviteCode?: string;
  memberCount?: number;
  createdAt: string;
}

export interface ServerListItem extends ServerDto {
  currentUserRole?: Role;
}

export interface ServerDetail extends ServerDto {
  channels: ChannelListItem[];
  currentUserRole: Role;
  memberCount: number;
}

export interface ServerMember {
  userId: EntityId;
  username: string;
  profilePictureUrl?: string;
  globalNickname?: string;
  role: Role;
  joinedAt: string;
}

export interface CreateServerPayload {
  name: string;
  description?: string;
}

export interface UpdateServerPayload {
  name?: string;
  description?: string | null;
  iconUrl?: string | null;
}

export interface JoinServerPayload {
  inviteCode: string;
}

// Channel Types
export interface ChannelDto {
  id: EntityId;
  serverId: EntityId;
  name: string;
  description?: string;
  type: ChannelType;
  position: number;
  createdAt: string;
}

export interface ChannelListItem extends ChannelDto {}

export interface ChannelDetail extends ChannelDto {
  memberCount?: number;
}

export interface CreateChannelPayload {
  name: string;
  type: ChannelType;
  description?: string;
}

export interface UpdateChannelPayload {
  name?: string;
  description?: string | null;
  position?: number;
}

// Message Types
export interface MessageDto {
  id: EntityId;
  channelId: EntityId;
  userId: EntityId;
  content: string;
  attachments?: string[];
  mentionedUserIds?: EntityId[];
  mentionedRoleIds?: EntityId[];
  isEdited: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MessageListItem extends MessageDto {
  user: UserDto;
}

export interface CreateMessagePayload {
  content: string;
  attachments?: string[];
  mentionedUserIds?: EntityId[];
  mentionedRoleIds?: EntityId[];
}

export interface UpdateMessagePayload {
  content: string;
}

// Real-time Event Payloads
export interface MessageDeletedPayload {
  messageId: EntityId;
  channelId: EntityId;
}

export interface UserServerPayload {
  userId: EntityId;
  serverId: EntityId;
  serverName?: string;
  user?: UserDto;
}

export interface ChannelDeletedPayload {
  channelId: EntityId;
  serverId: EntityId;
}

export interface EmojiDto {
  id: EntityId;
  serverId: EntityId;
  name: string;
  imageUrl: string;
  createdAt: string;
}

export interface EmojiDeletedPayload {
  emojiId: EntityId;
  serverId: EntityId;
}

export interface MemberRolesUpdatedPayload {
  serverId: EntityId;
  userId: EntityId;
  newRole: Role;
}

export interface ReactionPayload {
  messageId: EntityId;
  userId: EntityId;
  emoji: string;
}

export interface VoiceChannelPayload {
  channelId: EntityId;
  userId: EntityId;
  action: 'join' | 'leave';
}

export interface WebRTCSignalPayload {
  channelId: EntityId;
  userId: EntityId;
  signal: any;
}

export interface ScreenSharePayload {
  channelId: EntityId;
  userId: EntityId;
  isSharing: boolean;
}

// API Response Types
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface MessageQueryParams {
  before?: EntityId;
  after?: EntityId;
  limit?: number;
}

// Form Types
export interface ServerFormData {
  name: string;
  description: string;
  iconUrl?: string;
}

export interface ChannelFormData {
  name: string;
  type: ChannelType;
  description: string;
}

// UI State Types
export interface Toast {
  id?: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

export interface ModalState {
  isOpen: boolean;
  data?: any;
}