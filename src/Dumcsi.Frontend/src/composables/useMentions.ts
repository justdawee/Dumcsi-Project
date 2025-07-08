import { ref, nextTick, type Ref } from 'vue';
import { debounce } from 'lodash';
import userService from '@/services/userService';
import { useUserDisplay } from './useUserDisplay';
import type { UserSearchResult, EntityId } from '@/services/types';

export function useMentions(messageContent: Ref<string>, messageInput: Ref<HTMLTextAreaElement | undefined>) {
  // --- State ---
  const showMentionSuggestions = ref(false);
  const mentionSuggestions = ref<UserSearchResult[]>([]);
  const currentMentionSearch = ref('');
  const selectedMentionIndex = ref(0);
  const mentionedUserIds = ref<Set<EntityId>>(new Set());
  const mentionPosition = ref(0); // The starting index of the '@' character

  // --- Composables ---
  const { getDisplayName } = useUserDisplay();

  // --- Methods ---

  const searchUsers = debounce(async (query: string) => {
    if (query.length < 1) {
      mentionSuggestions.value = [];
      return;
    }
    try {
      const response = await userService.searchUsers(query);
      mentionSuggestions.value = response.data;
      selectedMentionIndex.value = 0;
    } catch (error) {
      console.error('User search for mentions failed:', error);
      mentionSuggestions.value = [];
    }
  }, 300);

  const closeMentionSuggestions = () => {
    showMentionSuggestions.value = false;
    currentMentionSearch.value = '';
    selectedMentionIndex.value = 0;
    mentionSuggestions.value = [];
  };

  const checkForMentions = () => {
    if (!messageInput.value) return;

    const cursorPosition = messageInput.value.selectionStart;
    const textBeforeCursor = messageContent.value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Ensure there are no spaces or newlines after the '@'
      if (!/\s/.test(textAfterAt)) {
        currentMentionSearch.value = textAfterAt;
        mentionPosition.value = lastAtIndex;
        showMentionSuggestions.value = true;
        searchUsers(textAfterAt);
      } else {
        closeMentionSuggestions();
      }
    } else {
      closeMentionSuggestions();
    }
  };

  const selectMention = (user: UserSearchResult) => {
    if (!messageInput.value) return;

    const beforeMention = messageContent.value.substring(0, mentionPosition.value);
    const afterMention = messageContent.value.substring(mentionPosition.value + currentMentionSearch.value.length + 1);

    const mentionText = `@${getDisplayName(user)}`;
    messageContent.value = `${beforeMention}${mentionText} ${afterMention}`;

    mentionedUserIds.value.add(user.id);
    closeMentionSuggestions();

    // Set cursor position after the inserted mention
    nextTick(() => {
      if (messageInput.value) {
        const newCursorPosition = beforeMention.length + mentionText.length + 1;
        messageInput.value.focus();
        messageInput.value.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    });
  };

  const handleMentionKeyDown = (event: KeyboardEvent): boolean => {
    if (!showMentionSuggestions.value) return false;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        selectedMentionIndex.value = Math.max(0, selectedMentionIndex.value - 1);
        return true;

      case 'ArrowDown':
        event.preventDefault();
        selectedMentionIndex.value = Math.min(mentionSuggestions.value.length - 1, selectedMentionIndex.value + 1);
        return true;

      case 'Enter':
      case 'Tab':
        if (mentionSuggestions.value[selectedMentionIndex.value]) {
          event.preventDefault();
          selectMention(mentionSuggestions.value[selectedMentionIndex.value]);
        }
        return true;

      case 'Escape':
        event.preventDefault();
        closeMentionSuggestions();
        return true;
    }
    return false;
  };

  const clearMentions = () => {
    mentionedUserIds.value.clear();
  };

  return {
    showMentionSuggestions,
    mentionSuggestions,
    selectedMentionIndex,
    mentionedUserIds,
    checkForMentions,
    selectMention,
    handleMentionKeyDown,
    clearMentions,
  };
}
