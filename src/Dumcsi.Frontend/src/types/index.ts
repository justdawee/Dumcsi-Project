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

export type ChannelType = 'Text' | 'Voice' | 'Announcement';

// --- Type Aliases ---
export type EntityId = string; // A backend long-ot használ, de a frontenden string-ként biztonságosabb kezelni
export type ISODateString = string; // A backend Instant típusát string-ként kezeljük

// --- Auth DTOs ---
export interface RegisterDto {
  username: string;
  password: string;
  email: string;
}

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// --- User DTOs ---
export interface User {
  id: EntityId;
  username: string;
  globalNickname?: string | null;
  email: string;
  avatarUrl?: string | null;
  status?: string;
  createdAt: ISODateString;
  lastSeenAt: ISODateString;
  isOnline: boolean;
}

export interface UpdateProfileDto {
  username?: string;
  status?: string;
}

// --- Server DTOs ---
export interface Server {
  id: EntityId;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  ownerId: EntityId;
  memberCount: number;
  isPublic: boolean;
  createdAt: ISODateString;
  unreadCount?: number;
}

export interface ServerDetails extends Server {
  channels: Channel[];
  roles: Role[];
  members: ServerMember[];
}

export interface CreateServerDto {
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface UpdateServerDto extends Partial<CreateServerDto> {}

export interface ServerMember {
    userId: EntityId;
    user: User;
    nickname?: string | null;
    role: string; // Egyszerűsítve a szerepkör neve
    joinedAt: ISODateString;
}

// --- Channel DTOs ---
export interface Channel {
  id: EntityId;
  name: string;
  description?: string | null;
  type: ChannelType;
  position: number;
  serverId: EntityId;
  lastMessageAt?: ISODateString;
  unreadCount?: number;
}

export interface CreateChannelDto {
  serverId: EntityId;
  name: string;
  description?: string;
  type: ChannelType;
}

export interface UpdateChannelDto extends Partial<Omit<CreateChannelDto, 'serverId'>> {}

// --- Message DTOs ---
export interface Message {
  id: EntityId;
  channelId: EntityId;
  authorId: EntityId;
  author: User;
  content: string;
  createdAt: ISODateString;
  isEdited: boolean;
  isPinned: boolean;
  mentions: User[];
  attachmentUrls?: string[];
  replyTo?: Message;
}

export interface CreateMessageDto {
  content: string;
  attachmentUrls?: string[];
  replyToId?: EntityId;
}

export interface UpdateMessageDto {
  content: string;
}

// --- Invite DTOs ---
export interface Invite {
  code: string;
  server: {
    id: EntityId;
    name: string;
    iconUrl: string | null;
    memberCount: number;
    description: string | null;
  };
  inviter: User;
  expiresAt?: ISODateString;
}

export interface CreateInviteDto {
  serverId: EntityId;
  maxUses?: number | null;
  expiresInHours?: number | null;
}

// --- Role DTOs ---
export interface Role {
    id: EntityId;
    name: string;
    color: string;
    position: number;
    permissions: Permission;
}

// --- WebSocket Payloads ---
export interface TypingIndicator {
  userId: EntityId;
  username: string;
  channelId: EntityId;
}

export interface UserPresence {
  userId: EntityId;
  isOnline: boolean;
  lastSeenAt: ISODateString;
}

// --- API Responses ---
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}