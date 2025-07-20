import {ref, nextTick, type Ref, computed} from 'vue';
import userService from '@/services/userService';
import {useUserDisplay} from './useUserDisplay';
import {useAppStore} from '@/stores/app';
import type {UserProfileDto, EntityId, Role} from '@/services/types';
import {usePermissions} from '@/composables/usePermissions';

type MentionSuggestion =
    | { type: 'user'; data: UserProfileDto }
    | { type: 'role'; data: Role };

export function useMentions(messageContent: Ref<string>, messageInput: Ref<HTMLTextAreaElement | undefined>) {
    // --- State ---
    const showMentionSuggestions = ref(false);
    const mentionSuggestions = ref<MentionSuggestion[]>([]);
    const currentMentionSearch = ref('');
    const selectedMentionIndex = ref(0);
    const mentionedUserIds = ref<Set<EntityId>>(new Set());
    const mentionedRoleIds = ref<Set<EntityId>>(new Set());
    const mentionPosition = ref(0);
    const scrollContainer = ref<HTMLDivElement>();

    // --- Composables ---
    const {getDisplayName} = useUserDisplay();
    const {permissions} = usePermissions();
    const appStore = useAppStore();

    // --- Computed ---
    const mentionableRoles = computed(() => {
        const server = appStore.currentServer;
        if (!server?.roles) return [];

        if (permissions.mentionEveryone.value) {
            return server.roles;
        }

        return server.roles.filter(role =>
            role.name === '@everyone' || role.isMentionable
        );
    });

    // --- Methods ---

    const searchMentions = async (query: string) => {
        const suggestions: MentionSuggestion[] = [];
        const lowerQuery = query.toLowerCase();

        // Ha nincs query (csak @ jel), minden tagot és szerepkört megjelenítünk
        if (query.length === 0) {
            // Összes tag lekérése
            const members = appStore.members;
            members.forEach(member => {
                suggestions.push({
                    type: 'user',
                    data: {
                        id: member.userId,
                        username: member.username,
                        globalNickname: member.globalNickname,
                        avatar: member.avatarUrl
                    } as UserProfileDto
                });
            });

            // Összes mentionálható szerepkör
            mentionableRoles.value.forEach(role => {
                suggestions.push({type: 'role', data: role});
            });
        } else {
            // Szűrt keresés
            // Felhasználó keresés
            try {
                const users = await userService.searchUsers(query);
                users.forEach(user => {
                    suggestions.push({type: 'user', data: user});
                });
            } catch (error) {
                console.error('User search for mentions failed:', error);
            }

            // Role keresés
            const matchingRoles = mentionableRoles.value.filter(role =>
                role.name.toLowerCase().includes(lowerQuery)
            );
            matchingRoles.forEach(role => {
                suggestions.push({type: 'role', data: role});
            });
        }

        mentionSuggestions.value = suggestions;
        selectedMentionIndex.value = 0;

        nextTick(() => {
            if (scrollContainer.value) {
                scrollContainer.value.scrollTop = 0;
            }
        });
    };

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
                // Azonnal keresünk, még üres string esetén is (csak @ jel)
                searchMentions(textAfterAt);
            } else {
                closeMentionSuggestions();
            }
        } else {
            closeMentionSuggestions();
        }
    };

    const selectMention = (suggestion: MentionSuggestion) => {
        if (!messageInput.value) return;

        const beforeMention = messageContent.value.substring(0, mentionPosition.value);
        const afterMention = messageContent.value.substring(mentionPosition.value + currentMentionSearch.value.length + 1);

        let mentionText = '';

        if (suggestion.type === 'user') {
            mentionText = `@${getDisplayName(suggestion.data)}`;
            mentionedUserIds.value.add(suggestion.data.id);
        } else {
            mentionText = `@${suggestion.data.name}`;
            mentionedRoleIds.value.add(suggestion.data.id);
        }

        messageContent.value = `${beforeMention}${mentionText} ${afterMention}`;

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

    const scrollToSelected = () => {
        nextTick(() => {
            if (!scrollContainer.value) return;

            const container = scrollContainer.value;
            const selectedElement = container.querySelector('[data-selected="true"]') as HTMLElement;

            if (!selectedElement) return;

            const containerHeight = container.clientHeight;
            const elementTop = selectedElement.offsetTop;
            const elementHeight = selectedElement.offsetHeight;
            const scrollTop = container.scrollTop;

            // Ha az elem a látható területen kívül van
            if (elementTop < scrollTop) {
                container.scrollTop = elementTop;
            } else if (elementTop + elementHeight > scrollTop + containerHeight) {
                container.scrollTop = elementTop + elementHeight - containerHeight;
            }
        });
    };

    const handleMentionKeyDown = (event: KeyboardEvent): boolean => {
        if (!showMentionSuggestions.value) return false;

        switch (event.key) {
            case 'ArrowUp':
                event.preventDefault();
                selectedMentionIndex.value = Math.max(0, selectedMentionIndex.value - 1);
                scrollToSelected();
                return true;

            case 'ArrowDown':
                event.preventDefault();
                selectedMentionIndex.value = Math.min(mentionSuggestions.value.length - 1, selectedMentionIndex.value + 1);
                scrollToSelected();
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

    const handleMentionMouseEnter = (index: number) => {
        selectedMentionIndex.value = index;
    };

    const clearMentions = () => {
        mentionedUserIds.value.clear();
        mentionedRoleIds.value.clear();
    };

    return {
        showMentionSuggestions,
        mentionSuggestions,
        selectedMentionIndex,
        mentionedUserIds,
        mentionedRoleIds,
        checkForMentions,
        selectMention,
        handleMentionKeyDown,
        handleMentionMouseEnter,
        clearMentions,
        scrollContainer,
    };
}