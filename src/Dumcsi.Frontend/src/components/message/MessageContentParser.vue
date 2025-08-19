<template>
  <span class="message-content" v-bind="$attrs">
    <template v-for="item in parsedNodesWithIndex" :key="item.idx">
      <component :is="renderNode(item.node)" />
    </template>

    <!-- Keep modal within single-root to avoid extraneous attrs warning -->
    <AttachmentPreviewModal
        v-if="selectedGif"
        v-model="showGifPreview"
        :attachment="selectedGif"
        @update:modelValue="onGifPreviewClose"
    />
  </span>
</template>

<script lang="ts" setup>
import { computed, h, ref, watch, nextTick, type VNode } from 'vue';
import { useAppStore } from '@/stores/app';
import { MarkdownParser, type ParsedNode } from '@/services/markdownParser';
import AttachmentPreviewModal from './AttachmentPreviewModal.vue';
import type { AttachmentDto } from '@/services/types';

const props = defineProps<{
  content: string;
  mentionedUserIds?: number[];
  mentionedRoleIds?: number[];
}>();

const appStore = useAppStore();

// Create context maps for mentions
const userMap = computed(() => {
  const map = new Map<string, any>();

  if (props.mentionedUserIds && props.mentionedUserIds.length > 0) {
    appStore.members.forEach(member => {
      if (props.mentionedUserIds?.includes(member.userId)) {
        const displayName = member.globalNickname || member.username;
        map.set(displayName.toLowerCase(), {
          id: member.userId,
          username: member.username,
          displayName: displayName
        });
        map.set(member.username.toLowerCase(), {
          id: member.userId,
          username: member.username,
          displayName: displayName
        });
      }
    });
  }

  return map;
});

const showGifPreview = ref(false);
const selectedGif = ref<AttachmentDto | null>(null);

const openGifPreview = (url: string) => {
  selectedGif.value = {
    id: 0,
    fileName: 'gif',
    fileUrl: url,
    fileSize: 0,
    contentType: 'image/gif',
    height: null,
    width: null,
    duration: null,
    waveform: null,
  };
  nextTick(() => {
    showGifPreview.value = true;
  });
};

const onGifPreviewClose = (val: boolean) => {
  showGifPreview.value = val;
};

watch(showGifPreview, (open) => {
  if (!open) {
    setTimeout(() => {
      selectedGif.value = null;
    }, 200);
  }
});

const roleMap = computed(() => {
  const map = new Map<string, any>();
  const server = appStore.currentServer;

  if (server?.roles && props.mentionedRoleIds && props.mentionedRoleIds.length > 0) {
    server.roles.forEach(role => {
      if (props.mentionedRoleIds?.includes(role.id)) {
        map.set(role.name.toLowerCase(), {
          id: role.id,
          name: role.name,
          color: role.color
        });
      }
    });
  }

  return map;
});

const channelMap = computed(() => {
  const map = new Map<string, any>();
  const server = appStore.currentServer;

  if (server?.channels) {
    server.channels.forEach(channel => {
      map.set(channel.name.toLowerCase(), {
        id: channel.id,
        name: channel.name
      });
    });
  }

  return map;
});

const parsedNodes = computed(() => {
  return MarkdownParser.parse(props.content, {
    mentionedUserIds: props.mentionedUserIds,
    mentionedRoleIds: props.mentionedRoleIds,
    userMap: userMap.value,
    roleMap: roleMap.value,
    channelMap: channelMap.value
  });
});

const parsedNodesWithIndex = computed(() =>
    parsedNodes.value.map((node, idx) => ({ node, idx }))
);

// Render function for nodes
const renderNode = (node: ParsedNode): VNode => {
  switch (node.type) {
    case 'text':
      return h('span', node.content);

    case 'bold':
      return h('strong', { class: 'font-bold' },
          node.children ? node.children.map(child => renderNode(child)) : node.content
      );

    case 'italic':
      return h('em', { class: 'italic' },
          node.children ? node.children.map(child => renderNode(child)) : node.content
      );

    case 'bolditalic':
      return h('strong', { class: 'font-bold italic' },
          node.children ? node.children.map(child => renderNode(child)) : node.content
      );

    case 'strikethrough':
      return h('del', { class: 'line-through opacity-60' },
          node.children ? node.children.map(child => renderNode(child)) : node.content
      );

    case 'code':
      return h('code', {
        class: 'px-1 py-0.5 rounded bg-bg-surface font-mono text-sm text-pink-400'
      }, node.content);

    case 'codeblock':
      return h('pre', {
        class: 'block my-2 p-3 rounded-md bg-bg-surface overflow-x-auto'
      }, [
        h('code', { class: 'font-mono text-sm text-text-secondary' }, node.content)
      ]);

    case 'blockquote':
      return h('blockquote', {
        class: 'border-l-4 border-text-muted pl-3 my-2 text-text-secondary'
      }, node.children ? node.children.map(child => renderNode(child)) : node.content);

    case 'spoiler':
      return h('span', {
        class: 'spoiler bg-text-tertiary text-transparent hover:text-text-secondary rounded px-0.5 cursor-pointer transition-colors',
        onClick: (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          target.classList.toggle('revealed');
        }
      }, node.children ? node.children.map(child => renderNode(child)) : node.content);

    case 'link':
      const url = node.data?.href as string | undefined;
      if (url && url.includes('tenor.com') && url.toLowerCase().endsWith('.gif')) {
        return h('img', {
          src: url,
          alt: 'GIF',
          class: 'preview-media rounded-lg cursor-pointer',
          loading: 'lazy',
          onClick: () => openGifPreview(url)
        });
      }
      return h('a', {
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'text-blue-400 hover:underline',
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
        }
      }, node.content);

    case 'user-mention':
      const userData = node.data;
      const displayName = userData?.username ? `@${userData.username}` : node.content;

      return h('span', {
        class: 'mention mention-user bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-medium rounded-md px-1 transition-colors cursor-pointer inline-block',
        'data-user-id': userData?.userId,
        onClick: () => {
          // Handle user mention click
          
        }
      }, displayName);

    case 'role-mention':
      const roleData = node.data;
      const roleName = roleData?.roleName ? `@${roleData.roleName}` : node.content;
      const isEveryone = roleData?.roleName === 'everyone' || node.content === '@everyone';

      return h('span', {
        class: `mention mention-role ${
            isEveryone
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
        } font-medium rounded-md px-1 transition-colors cursor-pointer inline-block`,
        'data-role-id': roleData?.roleId,
        style: roleData?.color ? {
          backgroundColor: `${roleData.color}20`,
          color: roleData.color
        } : undefined
      }, roleName);

    case 'channel-mention':
      const channelData = node.data;
      const channelName = channelData?.channelName ? `#${channelData.channelName}` : node.content;

      return h('span', {
        class: 'mention mention-channel bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-medium rounded-md px-1 transition-colors cursor-pointer inline-block',
        'data-channel-id': channelData?.channelId,
        onClick: () => {
          // Handle channel mention click - navigate to channel
          if (channelData?.channelId) {
            // TODO: Implement channel navigation logic
            //appStore.setCurrentChannel(channelData.channelId);
          }
        }
      }, [
        h('span', { class: 'opacity-60' }, '#'),
        channelName.substring(1)
      ]);

    case 'emoji':
      const emojiData = node.data;
      if (emojiData?.id) {
        // Custom emoji - would need CDN URL
        return h('img', {
          // TODO: Replace with actual CDN URL or path
          src: `https://192.168.0.50/emojis/${emojiData.id}.${emojiData.animated ? 'gif' : 'png'}?size=32`,
          alt: `:${emojiData.name}:`,
          class: 'inline-block w-5 h-5 mx-0.5 align-text-bottom',
          loading: 'lazy'
        });
      }
      return h('span', node.content);

    case 'linebreak':
      return h('br');

    default:
      return h('span', node.content);
  }
};
</script>

<style scoped>
@reference "@/style.css";

.message-content {
  @apply whitespace-pre-wrap break-words;
}

.spoiler.revealed {
  @apply bg-text-tertiary/30 text-text-secondary;
}

.preview-media {
  max-width: 400px;
  max-height: 240px;
}
</style>
