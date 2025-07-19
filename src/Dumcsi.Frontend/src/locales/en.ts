export const errorMessages: Record<string, string> = {
    // General Errors
    'NETWORK_ERROR': 'Could not connect to the server. Please check your network connection.',
    'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again later.',
    'RESOURCE_NOT_FOUND': 'The resource you were looking for could not be found.',
    'INVALID_REQUEST': 'The request was invalid. Please check the data and try again.',
    'FORBIDDEN': "You don't have permission to perform this action.",

    // Authentication Errors (AUTH_*)
    'AUTH_INVALID_CREDENTIALS': 'The username or password you entered is incorrect.',
    'AUTH_USERNAME_TAKEN': 'This username is already taken. Please choose another one.',
    'AUTH_EMAIL_TAKEN': 'This email address is already registered. Please log in.',
    'AUTH_REGISTRATION_CONFLICT': 'Registration failed. The username or email may already be in use.',
    'AUTH_INVALID_REFRESH_TOKEN': 'Your session has expired. Please log in again.',
    'AUTH_USER_NOT_FOUND': 'Your user account could not be found. Please log in again.', // This is a backend-only error, but good to have.
    'AUTH_UNKNOWN_ERROR': 'An unknown authentication error occurred.',

    // User & Profile Errors (USER_*, PROFILE_*, PASSWORD_*, AVATAR_*)
    'USER_NOT_FOUND': 'The specified user could not be found.',
    'PROFILE_UPDATE_INVALID_DATA': 'The profile information you provided is not valid.',
    'PROFILE_UPDATE_CONFLICT': 'The new username or email is already in use by another account.',
    'PASSWORD_CHANGE_INVALID_DATA': 'The new password information is not valid.',
    'PASSWORD_CHANGE_INVALID_CURRENT': 'The current password you entered is incorrect.',
    'AVATAR_FILE_MISSING': 'Please select a file to upload for your avatar.',
    'AVATAR_FILE_TOO_LARGE': 'The avatar image cannot be larger than 10MB.',
    'AVATAR_INVALID_FILE_TYPE': 'Invalid file type. Please use a JPG, PNG, GIF, or WEBP image.',
    'AVATAR_INVALID_DIMENSIONS': 'The avatar image dimensions cannot exceed 1024x1024 pixels.',
    'AVATAR_PROCESSING_ERROR': 'There was an error processing your avatar image.',
    'AVATAR_DELETE_ERROR': 'There was an error deleting your avatar.',

    // Server Errors (SERVER_*)
    'SERVER_NOT_FOUND': 'The requested server does not exist.',
    'SERVER_FORBIDDEN_VIEW': 'You do not have permission to view this server.',
    'SERVER_FORBIDDEN_MANAGE': 'You do not have permission to manage this server.',
    'SERVER_FORBIDDEN_NOT_OWNER': 'Only the server owner can perform this action.',
    'SERVER_MEMBERS_FORBIDDEN_VIEW': 'You do not have permission to view the member list for this server.',
    'SERVER_OWNER_CANNOT_LEAVE': 'The server owner cannot leave their own server. Please delete the server instead.',
    'SERVER_LEAVE_NOT_MEMBER': "You cannot leave a server you're not a member of.",
    'SERVER_JOIN_NOT_PUBLIC': 'This server is not public. You need an invite to join.',
    'SERVER_JOIN_ALREADY_MEMBER': 'You are already a member of this server.',
    'SERVER_UPDATE_INVALID_DATA': 'The data provided for updating the server is invalid.',
    'SERVER_ICON_FORBIDDEN_MANAGE': "You do not have permission to manage this server's icon.",
    'SERVER_ICON_FILE_MISSING': 'Please select a file to upload for the server icon.',
    'SERVER_ICON_FILE_TOO_LARGE': 'The server icon cannot be larger than 20MB.',
    'SERVER_ICON_INVALID_FILE_TYPE': 'Invalid file type. Please use a JPG, PNG, GIF, or WEBP image.',
    'SERVER_ICON_INVALID_DIMENSIONS': 'The server icon dimensions cannot exceed 1024x1024 pixels.',
    'SERVER_ICON_PROCESSING_ERROR': 'There was an error processing the server icon.',
    'SERVER_ICON_DELETE_ERROR': 'There was an error deleting the server icon.',
    'SERVER_SETUP_ERROR': 'A server configuration error occurred. The default role is missing.',

    // Channel Errors (CHANNEL_*)
    'CHANNEL_NOT_FOUND': 'The requested channel does not exist.',
    'CHANNEL_ACCESS_DENIED': 'You are not a member of this server.',
    'CHANNEL_FORBIDDEN_VIEW': 'You do not have permission to view this channel.',
    'CHANNEL_FORBIDDEN_MANAGE': 'You do not have permission to manage this channel.',
    'CHANNEL_FORBIDDEN_DELETE': 'You do not have permission to delete this channel.',
    'CHANNEL_UPDATE_INVALID_DATA': 'The data provided for updating the channel is invalid.',
    'CHANNEL_LIST_FORBIDDEN_VIEW': 'You do not have permission to view channels on this server.',
    'CHANNEL_CREATE_INVALID_DATA': 'The data provided for creating a channel is invalid.',
    'CHANNEL_FORBIDDEN_CREATE': 'You do not have permission to create channels on this server.',

    // Role Errors (ROLE_*)
    'ROLE_FORBIDDEN_VIEW': 'You do not have permission to view roles.',
    'ROLE_SERVER_NOT_FOUND': 'The server to add the role to does not exist.',
    'ROLE_FORBIDDEN_CREATE': 'You do not have permission to create roles.',
    'ROLE_FORBIDDEN_UPDATE': 'You do not have permission to update roles.',
    'ROLE_NOT_FOUND': 'The specified role does not exist.',
    'ROLE_CANNOT_DELETE_DEFAULT': "Default roles ('@everyone', 'Admin') cannot be deleted.",
    'ROLE_FORBIDDEN_ASSIGN': 'You do not have permission to manage member roles.',
    'ROLE_MEMBER_NOT_FOUND': 'The specified member was not found in this server.',

    // Message Errors (MESSAGE_*)
    'MESSAGE_INVALID_DATA': 'The provided message data is invalid.',
    'MESSAGE_ACCESS_DENIED': 'You are not a member of this server.',
    'MESSAGE_FORBIDDEN_SEND': 'You do not have permission to send messages in this channel.',
    'MESSAGE_FORBIDDEN_MENTION_ROLES': 'You do not have permission to mention roles in this channel.',
    'MESSAGE_FORBIDDEN_MENTION_NOT_MENTIONABLE': 'You do not have permission to mention one of the selected roles.',
    'MESSAGE_SEND_PREREQUISITES_NOT_FOUND': 'Could not send message. The channel or your user account could not be found.',
    'MESSAGE_FORBIDDEN_READ_HISTORY': 'You do not have permission to read the message history in this channel.',
    'MESSAGE_NOT_FOUND': 'The message you are trying to access does not exist.',
    'MESSAGE_UPDATE_INVALID_DATA': 'The provided data for updating the message is invalid.',
    'MESSAGE_FORBIDDEN_EDIT': 'You can only edit your own messages.',
    'MESSAGE_FORBIDDEN_DELETE': "You can only delete your own messages or you need 'Manage Messages' permission.",

    // Reaction Errors (REACTION_*)
    'REACTION_ACCESS_DENIED': 'You are not a member of this server.',
    'REACTION_FORBIDDEN_ADD': 'You do not have permission to add reactions in this channel.',
    'REACTION_PREREQUISITES_NOT_FOUND': 'Could not add reaction. The message or user could not be found.',

    // Invite Errors (INVITE_*)
    'INVITE_NOT_FOUND_OR_EXPIRED': 'This invite is invalid or has expired.',
    'INVITE_MAX_USES_REACHED': 'This invite has reached its maximum number of uses.',
    'INVITE_ALREADY_MEMBER': 'You are already a member of this server.',
    'INVITE_FORBIDDEN_CREATE': "You don't have permission to create invites.",
    'INVITE_CREATE_PREREQUISITES_NOT_FOUND': 'Could not create invite. The server or your user account could not be found.',
    'INVITE_FORBIDDEN_DELETE': "You don't have permission to delete invites.",
    'INVITE_NOT_FOUND': 'Invite not found.',

    // Attachment Errors (ATTACHMENT_*)
    'ATTACHMENT_ACCESS_DENIED': 'You are not a member of this server.',
    'ATTACHMENT_FORBIDDEN_UPLOAD': 'You do not have permission to attach files in this channel.',
    'ATTACHMENT_FILE_MISSING': 'No file was uploaded.',
    'ATTACHMENT_FILE_TOO_LARGE': 'File size cannot exceed 50MB.',
    'ATTACHMENT_UPLOAD_ERROR': 'An error occurred during file upload.',
};