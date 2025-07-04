// --- Enums ---
export enum Role { Member = 0, Moderator = 1, Admin = 2 }
export enum ChannelType { Text = 0, Voice = 1 }
export enum ModerationStatus { Visible = 0, UserDeleted = 1, ModeratedRemoved = 2 }

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
  profilePictureUrl?: string;
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
}

export interface ServerMember {
  userId: EntityId;
  username: string;
  profilePictureUrl?: string;
  role: Role;
  joinedAt: ISODateString;
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
}

// Message
export interface MessageListItem {
  id: EntityId;
  content: string;
  senderId: EntityId;
  senderUsername: string;
  moderationStatus: ModerationStatus;
  createdAt: ISODateString;
  editedAt?: ISODateString;
}

// --- Payloads ---
export interface LoginPayload {
  usernameOrEmail: string;
  password: string
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  username: string;
  email: string;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface CreateServerPayload {
  name: string;
  description?: string;
  isPublic: boolean;
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
export interface InviteResponse {
  inviteCode: string;
  message: string;
}

export interface JoinServerResponse {
  message: string;
  serverName: string;
  serverId: EntityId;
}

// --- Other Payloads ---
export interface CreateChannelPayload {
  name: string;
  description?: string;
  type: ChannelType;
}

export interface UpdateChannelPayload {
  name: string;
  position: number;
}

export interface CreateMessagePayload {
    content: string;
}

export interface UpdateMessagePayload {
    content: string;
}