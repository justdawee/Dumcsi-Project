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
  isOwner: boolean; // TODO: role-based access control should be handled on the server side, this is just for UI convenience
  memberLimit: number;
  isPublic: boolean;
  createdAt: string; // TODO: consider using a Date object instead of string for better type safety
}

export interface ServerDetail extends ServerListItem {
  ownerUsername: string; // TODO: duplicated data, consider fetching this from the server when needed
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

// TODO: password is sent twice, security concern, consider hashing on client side or using a more secure method
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

export interface InviteResponse {
  inviteCode: string;
  message: string;
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

export interface UpdateServerPayload {
  name: string;
  description?: string | null; // TODO: consider using an empty string instead of null for better consistency
  iconUrl?: string | null;
  isPublic: boolean;
}