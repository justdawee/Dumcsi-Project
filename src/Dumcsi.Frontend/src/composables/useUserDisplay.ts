import type { UserDto, UserProfile, UserSearchResult, ServerMember } from '@/services/types';

/**
 * Composable for handling user display logic
 * Prioritizes GlobalNickname over Username
 */
export function useUserDisplay() {
  /**
   * Get display name for a user
   * Prioritizes: GlobalNickname > Username
   */
  const getDisplayName = (user: UserDto | UserProfile | UserSearchResult | ServerMember | null | undefined): string => {
    if (!user) return 'Unknown User';
    
    // For UserSearchResult and UserProfile
    if ('globalNickname' in user && user.globalNickname) {
      return user.globalNickname;
    }
    
    // For all user types
    return user.username || 'Unknown User';
  };

  /**
   * Get avatar URL with fallback
   */
  const getAvatarUrl = (user: UserDto | UserProfile | UserSearchResult | ServerMember | null | undefined): string | null => {
    if (!user) return null;
    
    // Handle different property names
    if ('avatarUrl' in user) {
      return user.avatarUrl || null;
    }
    
    return null;
  };

  /**
   * Generate initials from display name
   */
  const getInitials = (user: UserDto | UserProfile | UserSearchResult | ServerMember | null | undefined): string => {
    const displayName = getDisplayName(user);
    
    const words = displayName.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    
    return displayName.substring(0, 2).toUpperCase();
  };

  /**
   * Format mention text for a user
   */
  const getMentionText = (user: UserDto | UserProfile | UserSearchResult | ServerMember): string => {
    return `@${getDisplayName(user)}`;
  };

  /**
   * Check if user has custom avatar
   */
  const hasCustomAvatar = (user: UserDto | UserProfile | UserSearchResult | ServerMember | null | undefined): boolean => {
    return !!getAvatarUrl(user);
  };

  /**
   * Get user color based on ID (for default avatars)
   */
  const getUserColor = (userId: number): string => {
    const colors = [
      '#7c3aed', // purple
      '#2563eb', // blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    
    return colors[userId % colors.length];
  };

  return {
    getDisplayName,
    getAvatarUrl,
    getInitials,
    getMentionText,
    hasCustomAvatar,
    getUserColor,
  };
}