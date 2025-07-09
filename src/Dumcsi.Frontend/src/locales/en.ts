export const errorMessages: Record<string, string> = {
  // Auth Controller
  AUTH_REGISTRATION_CONFLICT: "Username or email is already taken.",
  AUTH_INVALID_CREDENTIALS: "Invalid username or password.",
  AUTH_INVALID_REFRESH_TOKEN: "The provided refresh token is invalid or has expired.",
  AUTH_USER_NOT_FOUND: "Authenticated user could not be found.",

  // Channel Controller
  CHANNEL_ACCESS_DENIED: "You are not a member of this server.",
  CHANNEL_FORBIDDEN_VIEW: "You do not have permission to view this channel.",
  CHANNEL_NOT_FOUND: "The requested channel does not exist.",
  CHANNEL_UPDATE_INVALID_DATA: "The provided data for updating the channel is invalid.",
  CHANNEL_FORBIDDEN_MANAGE: "You do not have permission to manage this channel.",
  CHANNEL_FORBIDDEN_DELETE: "You do not have permission to delete this channel.",
  CHANNEL_LIST_FORBIDDEN_VIEW: "You do not have permission to view channels on this server.",
  CHANNEL_CREATE_INVALID_DATA: "The provided data for creating a channel is invalid.",
  CHANNEL_FORBIDDEN_CREATE: "You do not have permission to create channels on this server.",

  // Message Controller
  MESSAGE_INVALID_DATA: "The provided message data is invalid.",
  MESSAGE_FORBIDDEN_SEND: "You do not have permission to send messages in this channel.",
  MESSAGE_FORBIDDEN_MENTION_ROLES: "You do not have permission to mention roles in this channel.",
  MESSAGE_SEND_PREREQUISITES_NOT_FOUND: "Channel or author user not found.",
  MESSAGE_FORBIDDEN_MENTION_NOT_MENTIONABLE: "You do not have permission to mention this role.",
  MESSAGE_FORBIDDEN_READ_HISTORY: "You do not have permission to read the message history in this channel.",
  MESSAGE_NOT_FOUND: "The target message does not exist in this channel.",
  MESSAGE_UPDATE_INVALID_DATA: "The provided data for updating the message is invalid.",
  MESSAGE_FORBIDDEN_DELETE: "You can only delete your own messages or you need 'Manage Messages' permission.",

  // Attachment errors
  ATTACHMENT_ACCESS_DENIED: "You are not a member of this server.",
  ATTACHMENT_FORBIDDEN_UPLOAD: "You do not have permission to attach files in this channel.",
  ATTACHMENT_FILE_MISSING: "No file was uploaded.",
  ATTACHMENT_FILE_TOO_LARGE: "File size cannot exceed 50MB.",
  ATTACHMENT_UPLOAD_ERROR: "An error occurred during file upload.",

  // Role Controller
  ROLE_FORBIDDEN_VIEW: "You do not have permission to view roles.",
  ROLE_FORBIDDEN_CREATE: "You do not have permission to create roles.",
  ROLE_SERVER_NOT_FOUND: "The server to add the role to does not exist.",
  ROLE_FORBIDDEN_UPDATE: "You do not have permission to update roles.",
  ROLE_NOT_FOUND: "The role to update does not exist.",
  ROLE_FORBIDDEN_DELETE: "You do not have permission to delete roles.",
  ROLE_CANNOT_DELETE_DEFAULT: "Default roles ('@everyone', 'Admin') cannot be deleted.",
  ROLE_FORBIDDEN_ASSIGN: "You do not have permission to manage member roles.",
  ROLE_MEMBER_NOT_FOUND: "The specified member was not found in this server.",

  // Server Controller
  SERVER_FORBIDDEN_VIEW: "You do not have permission to view this server.",
  SERVER_NOT_FOUND: "The requested server does not exist.",
  SERVER_UPDATE_INVALID_DATA: "The provided data for updating the server is invalid.",
  SERVER_FORBIDDEN_MANAGE: "You do not have permission to manage this server.",
  SERVER_FORBIDDEN_NOT_OWNER: "Only the server owner can update the server.",
  SERVER_MEMBERS_FORBIDDEN_VIEW: "You do not have permission to view server members.",
  SERVER_OWNER_CANNOT_LEAVE: "Server owner cannot leave. Delete the server instead.",
  SERVER_LEAVE_NOT_MEMBER: "You are not a member of this server.",
  SERVER_JOIN_NOT_PUBLIC: "This server is not public. You need an invite to join.",
  SERVER_JOIN_ALREADY_MEMBER: "You are already a member of this server.",
  SERVER_SETUP_ERROR: "The default '@everyone' role is missing on the server.",

  // Server Icon
  SERVER_ICON_FORBIDDEN_MANAGE: "You do not have permission to manage this server's icon.",
  SERVER_ICON_FILE_MISSING: "No file uploaded.",
  SERVER_ICON_FILE_TOO_LARGE: "File size cannot exceed 20MB.",
  SERVER_ICON_INVALID_FILE_TYPE: "Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.",
  SERVER_ICON_INVALID_DIMENSIONS: "Image dimensions cannot exceed 1024x1024 pixels.",
  SERVER_ICON_PROCESSING_ERROR: "An error occurred while processing the image.",
  SERVER_ICON_DELETE_ERROR: "Failed to delete server icon.",

  // User Controller
  USER_NOT_FOUND: "Authenticated user profile could not be found.",
  PROFILE_UPDATE_INVALID_DATA: "The provided profile data is invalid.",
  PROFILE_UPDATE_CONFLICT: "Username or email is already taken.",
  PASSWORD_CHANGE_INVALID_DATA: "The provided password data is invalid.",
  PASSWORD_CHANGE_INVALID_CURRENT: "The current password provided is incorrect.",

  // Avatar errors
  AVATAR_FILE_MISSING: "No file was uploaded.",
  AVATAR_FILE_TOO_LARGE: "File size cannot exceed 10MB.",
  AVATAR_INVALID_FILE_TYPE: "Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.",
  AVATAR_INVALID_DIMENSIONS: "Image dimensions cannot exceed 1024x1024 pixels.",
  AVATAR_PROCESSING_ERROR: "An error occurred while processing the image.",
  AVATAR_DELETE_ERROR: "An error occurred while deleting the avatar.",

  // Emoji Controller
  EMOJI_FORBIDDEN_VIEW: "You do not have permission to view emojis on this server.",
  EMOJI_FORBIDDEN_CREATE: "You do not have permission to create emojis.",
  EMOJI_INVALID_NAME: "Emoji name must be at least 2 characters long.",
  EMOJI_FILE_MISSING: "No file was uploaded.",
  EMOJI_FILE_TOO_LARGE: "File size cannot exceed 8MB.",
  EMOJI_INVALID_FILE_TYPE: "Invalid file type. Only JPG, PNG, GIF, WEBP, and AVIF are allowed.",
  EMOJI_CREATE_PREREQUISITES_NOT_FOUND: "Server or creator user not found.",
  EMOJI_INVALID_DIMENSIONS: "Image dimensions cannot exceed 128x128 pixels.",
  EMOJI_PROCESSING_ERROR: "An error occurred while processing the emoji.",
  EMOJI_FORBIDDEN_DELETE: "You do not have permission to delete emojis.",
  EMOJI_NOT_FOUND: "The emoji to delete does not exist.",

  // Invite Controller
  INVITE_NOT_FOUND_OR_EXPIRED: "This invite is invalid or has expired.",
  INVITE_MAX_USES_REACHED: "This invite has reached its maximum number of uses.",
  INVITE_ALREADY_MEMBER: "You are already a member of this server.",
  INVITE_FORBIDDEN_CREATE: "You don't have permission to create invites.",
  INVITE_CREATE_PREREQUISITES_NOT_FOUND: "Server or creator not found.",
  INVITE_FORBIDDEN_DELETE: "You don't have permission to delete invites.",
  INVITE_NOT_FOUND: "Invite not found.",

  // Audit Log Controller
  AUDIT_LOG_FORBIDDEN: "You do not have permission to view the audit log.",
}