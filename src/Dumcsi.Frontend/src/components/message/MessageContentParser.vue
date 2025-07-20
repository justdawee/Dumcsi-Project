<template>
  <span class="message-content">
    <template v-for="(part, index) in parsedContent" :key="index">
      <span v-if="part.type === 'text'">{{ part.content }}</span>
      <span v-else-if="part.type === 'user-mention'" class="mention mention-user">
        {{ part.content }}
      </span>
      <span v-else-if="part.type === 'role-mention'" class="mention mention-role">
        {{ part.content }}
      </span>
    </template>
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';

interface ContentPart {
  type: 'text' | 'user-mention' | 'role-mention';
  content: string;
}

const props = defineProps<{
  content: string;
  mentionedUserIds?: number[];
  mentionedRoleIds?: number[];
}>();

const appStore = useAppStore();

const parsedContent = computed(() => {
  const parts: ContentPart[] = [];
  const mentionRegex = /@([a-zA-Z0-9_\-\.]+)/g;
  let lastIndex = 0;
  let match;

  const content = props.content;

  // Gyűjtsük össze a felhasználók és szerepkörök neveit
  const userNames = new Map<string, number>();
  const roleNames = new Map<string, number>();

  // Ha vannak mentionált user/role ID-k, használjuk azokat
  if (props.mentionedUserIds && props.mentionedUserIds.length > 0) {
    appStore.members.forEach(member => {
      if (props.mentionedUserIds?.includes(member.userId)) {
        const displayName = member.globalNickname || member.username;
        userNames.set(displayName.toLowerCase(), member.userId);
        userNames.set(member.username.toLowerCase(), member.userId);
      }
    });
  }

  if (props.mentionedRoleIds && props.mentionedRoleIds.length > 0) {
    const server = appStore.currentServer;
    if (server?.roles) {
      server.roles.forEach(role => {
        if (props.mentionedRoleIds?.includes(role.id)) {
          roleNames.set(role.name.toLowerCase(), role.id);
        }
      });
    }
  }

  // Feldolgozzuk a szöveget
  while ((match = mentionRegex.exec(content)) !== null) {
    // Hozzáadjuk a mention előtti szöveget
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex, match.index)
      });
    }

    const mentionText = match[0]; // @username
    const mentionName = match[1].toLowerCase(); // username

    // Ellenőrizzük hogy user vagy role mention-e
    let mentionType: 'user-mention' | 'role-mention' | 'text' = 'text';

    if (userNames.has(mentionName)) {
      mentionType = 'user-mention';
    } else if (roleNames.has(mentionName) || mentionName === 'everyone') {
      mentionType = 'role-mention';
    }

    parts.push({
      type: mentionType,
      content: mentionText
    });

    lastIndex = match.index + match[0].length;
  }

  // Hozzáadjuk a maradék szöveget
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.substring(lastIndex)
    });
  }

  return parts;
});
</script>

<style scoped>
.message-content {
  @apply whitespace-pre-wrap break-words;
}

.mention {
  @apply font-medium rounded-md px-1 transition-colors cursor-pointer inline-block;
}

.mention-user {
  @apply bg-blue-500/20 text-blue-400 hover:bg-blue-500/30;
}

.mention-role {
  @apply bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30;
}
</style>