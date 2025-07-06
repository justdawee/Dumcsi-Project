import { computed, type ComputedRef } from 'vue';
//import type { UserDto, UserProfile, ServerMember } from '@/services/types';

// Type for any user-like object
type UserLike = {
  username: string;
  globalNickname?: string | null;
};

export function useUserDisplay() {
  /**
   * Gets the display name for a user (GlobalNickname or Username)
   */
  const getDisplayName = (user: UserLike | null | undefined): string => {
    if (!user) return 'Unknown User';
    return user.globalNickname || user.username;
  };

  /**
   * Creates a computed display name for reactive user objects
   */
  const createDisplayName = (user: ComputedRef<UserLike | null | undefined> | UserLike | null | undefined): ComputedRef<string> => {
    return computed(() => {
      const userData = typeof user === 'object' && 'value' in user! ? user.value : user;
      return getDisplayName(userData);
    });
  };

  /**
   * Formats a user mention for display in messages
   */
  const formatMention = (user: UserLike & { id: number }): string => {
    return `@${getDisplayName(user)}`;
  };

  /**
   * Gets initials from a user's display name (for avatar placeholders)
   */
  const getInitials = (user: UserLike | null | undefined): string => {
    const name = getDisplayName(user);
    const parts = name.split(' ');
    
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    
    return name.substring(0, 2).toUpperCase();
  };

  /**
   * Gets avatar URL with fallback
   */
  const getAvatarUrl = (user: { avatarUrl?: string | null; profilePictureUrl?: string | null } | null | undefined): string => {
    if (!user) return '/default-avatar.png';
    return user.avatarUrl || user.profilePictureUrl || '/default-avatar.png';
  };

  /**
   * Formats user status (online/offline)
   */
  const getUserStatus = (user: { isOnline?: boolean } | null | undefined): string => {
    if (!user || user.isOnline === undefined) return 'offline';
    return user.isOnline ? 'online' : 'offline';
  };

  /**
   * Gets status color for UI elements
   */
  const getStatusColor = (user: { isOnline?: boolean } | null | undefined): string => {
    const status = getUserStatus(user);
    return status === 'online' ? 'bg-green-500' : 'bg-gray-500';
  };

  /**
   * Searches for users by display name or username
   */
  const matchesSearch = (user: UserLike, searchQuery: string): boolean => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const username = user.username.toLowerCase();
    const globalNickname = user.globalNickname?.toLowerCase() || '';
    
    return username.includes(query) || globalNickname.includes(query);
  };

  /**
   * Sorts users by display name
   */
  const sortByDisplayName = (users: UserLike[]): UserLike[] => {
    return [...users].sort((a, b) => {
      const nameA = getDisplayName(a).toLowerCase();
      const nameB = getDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  /**
   * Groups users by first letter of display name
   */
  const groupByFirstLetter = (users: UserLike[]): Record<string, UserLike[]> => {
    const groups: Record<string, UserLike[]> = {};
    
    users.forEach(user => {
      const firstLetter = getDisplayName(user)[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(user);
    });
    
    return groups;
  };

  return {
    getDisplayName,
    createDisplayName,
    formatMention,
    getInitials,
    getAvatarUrl,
    getUserStatus,
    getStatusColor,
    matchesSearch,
    sortByDisplayName,
    groupByFirstLetter
  };
}

// Type exports for convenience
export type { UserLike };