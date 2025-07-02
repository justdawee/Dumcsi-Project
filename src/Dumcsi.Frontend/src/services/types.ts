// --- Enums ---
export enum Role {
  Member = 0,
  Moderator = 1,
  Admin = 2,
}

export enum ChannelType {
  Text = 0,
  Voice = 1,
}

export enum ModerationStatus {
  Visible = 0,
  UserDeleted = 1,
  ModeratedRemoved = 2,
}

// --- DTOs / Interfaces ---

// User & Auth
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  profilePictureUrl?: string;
}

// Server
export interface ServerListItem {
  id: number;
  name: string;
  description: string;
  iconUrl?: string;
  memberCount: number;
  ownerId: number;
  isOwner: boolean;
  memberLimit: number;
  isPublic: boolean;
  createdAt: string;
}

export interface ServerDetail extends ServerListItem {
  ownerUsername: string;
  currentUserRole: Role;
  channels: ChannelListItem[];
}

export interface ServerMember {
  userId: number;
  username: string;
  profilePictureUrl?: string;
  role: Role;
  joinedAt: string;
}

// Channel
export interface ChannelListItem {
  id: number;
  name: string;
  description?: string;
  type: ChannelType;
  position: number;
  createdAt: string;
}

export interface ChannelDetail extends ChannelListItem {
    messages: MessageListItem[];
}

// Message
export interface MessageListItem {
  id: number;
  content: string;
  senderId: number;
  senderUsername: string;
  moderationStatus: ModerationStatus;
  createdAt: string;
  editedAt?: string;
}

// Payloads
export interface LoginPayload {
  usernameOrEmail: string;
  password: string
}

export interface RegisterPayload extends LoginPayload {
  email: string;
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

export interface JoinServerPayload {
  inviteCode: string;
}

export interface JoinServerResponse {
  message: string;
  serverName: string;
  serverId: number;
}

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