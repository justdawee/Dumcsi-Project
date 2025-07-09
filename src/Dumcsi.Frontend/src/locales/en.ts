export const errorMessages: Record<string, string> = {
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  AUTH_EMAIL_ALREADY_EXISTS: 'Email already registered',
  AUTH_USERNAME_ALREADY_EXISTS: 'Username already taken',
  AUTH_INVALID_TOKEN: 'Invalid or expired token',
  AUTH_TOKEN_EXPIRED: 'Session expired. Please login again',
  AUTH_UNAUTHORIZED: 'You are not authorized to perform this action',
  
  // Server errors
  SERVER_NOT_FOUND: 'Server not found',
  SERVER_ACCESS_DENIED: 'You do not have access to this server',
  SERVER_NAME_ALREADY_EXISTS: 'A server with this name already exists',
  SERVER_MEMBER_LIMIT_REACHED: 'Server member limit reached',
  SERVER_ALREADY_MEMBER: 'You are already a member of this server',
  
  // Channel errors
  CHANNEL_NOT_FOUND: 'Channel not found',
  CHANNEL_ACCESS_DENIED: 'You do not have access to this channel',
  CHANNEL_NAME_ALREADY_EXISTS: 'A channel with this name already exists',
  CHANNEL_INVALID_TYPE: 'Invalid channel type',
  
  // Message errors
  MESSAGE_NOT_FOUND: 'Message not found',
  MESSAGE_TOO_LONG: 'Message is too long (max 2000 characters)',
  MESSAGE_EDIT_TIME_EXPIRED: 'Message can no longer be edited',
  MESSAGE_DELETE_DENIED: 'You can only delete your own messages',
  
  // User errors
  USER_NOT_FOUND: 'User not found',
  USER_BLOCKED: 'This user has blocked you',
  USER_ALREADY_BLOCKED: 'User is already blocked',
  
  // Invite errors
  INVITE_NOT_FOUND: 'Invalid or expired invite',
  INVITE_EXPIRED: 'This invite has expired',
  INVITE_MAX_USES_REACHED: 'This invite has reached its maximum uses',
  
  // Permission errors
  PERMISSION_DENIED: 'You do not have permission to perform this action',
  PERMISSION_INSUFFICIENT_ROLE: 'Your role does not have sufficient permissions',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'This field is required',
  VALIDATION_INVALID_EMAIL: 'Invalid email format',
  VALIDATION_PASSWORD_TOO_SHORT: 'Password must be at least 6 characters',
  VALIDATION_USERNAME_TOO_SHORT: 'Username must be at least 3 characters',
  
  // Rate limit errors
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  
  // Connection errors
  CONNECTION_ERROR: 'Connection error. Please check your internet connection',
  SERVER_ERROR: 'Server error. Please try again later'
}

export const messages = {
  auth: {
    loginSuccess: 'Successfully logged in',
    registerSuccess: 'Account created successfully',
    logoutSuccess: 'Successfully logged out',
    passwordResetSent: 'Password reset link sent to your email',
    passwordResetSuccess: 'Password reset successfully',
    emailVerified: 'Email verified successfully'
  },
  server: {
    created: 'Server created successfully',
    updated: 'Server updated successfully',
    deleted: 'Server deleted successfully',
    joined: 'Successfully joined server',
    left: 'Successfully left server'
  },
  channel: {
    created: 'Channel created successfully',
    updated: 'Channel updated successfully',
    deleted: 'Channel deleted successfully'
  },
  message: {
    sent: 'Message sent',
    edited: 'Message edited',
    deleted: 'Message deleted',
    pinned: 'Message pinned',
    unpinned: 'Message unpinned'
  },
  user: {
    profileUpdated: 'Profile updated successfully',
    passwordChanged: 'Password changed successfully',
    userBlocked: 'User blocked',
    userUnblocked: 'User unblocked'
  },
  invite: {
    created: 'Invite created successfully',
    copied: 'Invite link copied to clipboard',
    revoked: 'Invite revoked'
  }
}