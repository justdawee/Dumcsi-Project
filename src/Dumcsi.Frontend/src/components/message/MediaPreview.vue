<template>
  <div v-if="embeddableMedia.length > 0" class="media-previews space-y-2" v-bind="$attrs" ref="rootEl">
    <div
      v-for="(media, index) in embeddableMedia"
      :key="`${media.url}-${index}`"
      class="media-preview"
    >
      <!-- Image Preview -->
      <div
        v-if="media.type === 'image'"
        class="relative inline-block rounded-lg overflow-hidden border border-border-default/50"
      >
        <div class="label-badge">{{ getLabel(media) }}</div>
        <img
          :src="media.url"
          :alt="media.title || 'Image'"
          class="preview-media cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
          @click="openPreview(media)"
          @error="handleImageError"
          @load="handleMediaLoad"
        />
      </div>

      <!-- GIF Preview -->
      <div
        v-else-if="media.type === 'gif'"
        class="relative inline-block rounded-lg overflow-hidden border border-border-default/50"
      >
        <div class="label-badge">{{ getLabel(media) }}</div>
        <img
          :src="media.url"
          alt="GIF"
          class="preview-media cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
          @click="openPreview(media)"
          @error="handleImageError"
          @load="handleMediaLoad"
        />
      </div>

      <!-- Video Preview -->
      <div
        v-else-if="media.type === 'video'"
        class="relative inline-block rounded-lg overflow-hidden border border-border-default/50 group"
      >
        <div class="label-badge">{{ getLabel(media) }}</div>
        <video
          :src="media.url"
          controls
          preload="metadata"
          class="preview-media"
          :data-media-url="media.url"
          @loadedmetadata="handleMediaLoad"
          @play="onHtml5VideoPlay(media, $event)"
        >
          Your browser does not support the video tag.
        </video>
        <button
          class="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/80 transition"
          @click.stop="openPreview(media)"
          title="Open"
        >
          <ExternalLink class="w-4 h-4" />
        </button>
      </div>

      <!-- Audio Preview -->
      <div
        v-else-if="media.type === 'audio'"
        class="bg-bg-surface border border-border-default rounded-lg p-3 max-w-md relative"
      >
        <div class="label-badge">{{ getLabel(media) }}</div>
        <div class="flex items-center gap-2 mb-2">
          <Volume2 class="w-4 h-4 text-text-muted" />
          <span class="text-sm text-text-secondary">Audio File</span>
        </div>
        <audio
          :src="media.url"
          controls
          preload="metadata"
          class="w-full"
          @loadedmetadata="handleMediaLoad"
        >
          Your browser does not support the audio tag.
        </audio>
      </div>

      <!-- YouTube Embed -->
      <div
        v-else-if="media.type === 'youtube'"
        :class="[
          'youtube-embed',
          'preview-media',
          'rounded-lg overflow-hidden border border-border-default/50 relative inline-block',
          (isYouTubeShorts(media.url) && playingVideos.has(media.url)) ? 'shorts-playing' : ''
        ]"
      >
        <div class="label-badge">{{ getLabel(media) }}</div>
        <div
          v-if="!playingVideos.has(media.url)"
          class="relative cursor-pointer group"
          @click="playYouTubeVideo(media)"
        >
          <img
            :src="media.thumbnail"
            :alt="media.title || 'YouTube Video'"
            class="w-full h-auto group-hover:opacity-90 transition-opacity"
            loading="lazy"
            @error="handleThumbnailError"
            @load="handleMediaLoad"
          />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="bg-red-600 rounded-full p-3 group-hover:bg-red-700 transition-colors">
              <Play class="w-8 h-8 text-white ml-1" fill="white" />
            </div>
          </div>
          <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div class="flex items-center gap-2 text-white text-sm">
              <Youtube class="w-4 h-4" />
              <span>YouTube</span>
            </div>
          </div>
        </div>
        <iframe
          v-else
          :src="`${media.embedUrl}?autoplay=1`"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="w-full"
          :style="getYouTubeEmbedStyle(media)"
          @load="handleMediaLoad"
        ></iframe>
      </div>

      <!-- Twitter/X Embed Placeholder -->
      <div
        v-else-if="media.type === 'twitter'"
        class="bg-bg-surface border border-border-default rounded-lg p-4 max-w-md relative"
      >
        <div class="label-badge">{{ getLabel(media) }}</div>
        <div class="flex items-center gap-2 mb-2">
          <ExternalLink class="w-4 h-4 text-text-muted" />
          <span class="text-sm text-text-secondary">Twitter/X Post</span>
        </div>
        <a
          :href="media.url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-400 hover:underline text-sm break-all"
          @click.stop
        >
          {{ media.url }}
        </a>
        <p class="text-xs text-text-tertiary mt-2">
          Click to view on Twitter/X
        </p>
      </div>

      <!-- Generic Link Preview -->
      <div
        v-else-if="media.type === 'link'"
        class="bg-bg-surface border border-border-default rounded-lg p-3 max-w-md relative"
      >
        <div class="label-badge">{{ getLabel(media) }}</div>
        <div class="flex items-center gap-2 mb-2">
          <ExternalLink class="w-4 h-4 text-text-muted" />
          <span class="text-sm text-text-secondary">Link</span>
        </div>
        <a
          :href="media.url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-400 hover:underline text-sm break-all"
          @click.stop
        >
          {{ media.url }}
        </a>
      </div>
    </div>
  </div>

  <!-- Shared Attachment Preview Modal for fullscreen -->
  <AttachmentPreviewModal
    v-if="selectedAttachment"
    v-model="showPreview"
    :attachment="selectedAttachment"
    @update:modelValue="onClosePreview"
  />
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { Play, Volume2, Youtube, ExternalLink } from 'lucide-vue-next';
import { extractEmbeddableMedia, type EmbeddableMedia, isYouTubeShorts } from '@/utils/mediaDetection';
import { filterContentForDisplay } from '@/utils/contentFiltering';
import AttachmentPreviewModal from './AttachmentPreviewModal.vue';
import type { AttachmentDto } from '@/services/types';

defineOptions({
  inheritAttrs: false
});

const props = defineProps<{
  content: string;
  attachments?: any[]; // Message attachments (file uploads)
  showUrlsWithPreviews?: boolean; // Whether to show URLs alongside previews (default: false)
}>();

const emit = defineEmits<{
  (e: 'mediaLoaded'): void;
  (e: 'contentFiltered', filteredContent: string): void;
}>();

// State
const playingVideos = ref<Set<string>>(new Set());
const rootEl = ref<HTMLElement | null>(null);
const showPreview = ref(false);
const selectedAttachment = ref<AttachmentDto | null>(null);

// Extract embeddable media from content
const embeddableMedia = computed(() => {
  return extractEmbeddableMedia(props.content, props.attachments || []);
});

// Get URLs that should be hidden from content display
const embeddableUrls = computed(() => {
  return embeddableMedia.value
    .filter(media => !media.isUserAttachment) // Only hide user-typed URLs, not attachments
    .map(media => media.url);
});

// Filtered content with embeddable URLs removed (but keeping attachment URLs)
const filteredContent = computed(() => {
  return filterContentForDisplay(props.content, embeddableUrls.value, props.attachments || []);
});

// Watch for content changes and emit filtered content
watch(filteredContent, (newFilteredContent) => {
  emit('contentFiltered', newFilteredContent);
}, { immediate: true });

// Methods
const handleMediaLoad = () => {
  emit('mediaLoaded');
  // Dispatch event for message scroll adjustment
  try {
    window.dispatchEvent(new CustomEvent('messageMediaLoaded'));
  } catch (error) {
    console.warn('Could not dispatch messageMediaLoaded event:', error);
  }
};

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  console.warn('Failed to load image:', img.src);
};

const handleThumbnailError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  // Fallback to default resolution thumbnail
  const fallbackUrl = img.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
  if (img.src !== fallbackUrl) {
    img.src = fallbackUrl;
  } else {
    console.warn('Failed to load YouTube thumbnail:', img.src);
  }
};

const mediaToAttachment = (media: EmbeddableMedia): AttachmentDto => {
  const ext = (new URL(media.url).pathname.split('.').pop() || '').toLowerCase();
  const guessFileName = () => {
    try {
      const path = new URL(media.url).pathname;
      const name = path.substring(path.lastIndexOf('/') + 1) || media.type;
      return decodeURIComponent(name);
    } catch {
      return media.type;
    }
  };

  const contentType = (() => {
    switch (media.type) {
      case 'image': return `image/${ext || 'jpeg'}`;
      case 'gif': return 'image/gif';
      case 'video': return `video/${ext || 'mp4'}`;
      case 'audio': return `audio/${ext || 'mpeg'}`;
      default: return null;
    }
  })();

  return {
    id: 0,
    fileName: guessFileName(),
    fileUrl: media.url,
    fileSize: 0,
    contentType,
    height: null,
    width: null,
    duration: null,
    waveform: null,
  };
};

const openPreview = (media: EmbeddableMedia) => {
  if (media.type === 'image' || media.type === 'gif' || media.type === 'video' || media.type === 'audio') {
    selectedAttachment.value = mediaToAttachment(media);
    showPreview.value = true;
  }
};

const onClosePreview = (val: boolean) => {
  showPreview.value = val;
  if (!val) {
    // allow transition to finish
    setTimeout(() => { selectedAttachment.value = null; }, 200);
  }
};

const playYouTubeVideo = (media: EmbeddableMedia) => {
  // Ensure only this video's iframe is active in this component
  playingVideos.value.clear();
  playingVideos.value.add(media.url);
  // Notify all components to stop other media
  try {
    window.dispatchEvent(new CustomEvent('globalMediaPlay', { detail: { kind: 'youtube', id: media.url } }));
  } catch {}
};

const onHtml5VideoPlay = (media: EmbeddableMedia, event: Event) => {
  // Pause any other videos in this component
  pauseAllHtml5(media.url);
  // Notify others to stop
  try {
    window.dispatchEvent(new CustomEvent('globalMediaPlay', { detail: { kind: 'html5', id: media.url } }));
  } catch {}
};

const pauseAllHtml5 = (exceptId?: string) => {
  const root = rootEl.value;
  if (!root) return;
  const videos = root.querySelectorAll('video[data-media-url]');
  videos.forEach(v => {
    const el = v as HTMLVideoElement & { dataset: { mediaUrl?: string } };
    if (!exceptId || el.dataset.mediaUrl !== exceptId) {
      try { el.pause(); } catch {}
    }
  });
};

const getLabel = (media: EmbeddableMedia): string => {
  switch (media.type) {
    case 'gif': return 'GIF';
    case 'image': return 'Image';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'youtube': return isYouTubeShorts(media.url) ? 'YouTube Shorts' : 'YouTube';
    case 'twitter': return 'Twitter';
    default: return 'Link';
  }
};

const getYouTubeEmbedStyle = (media: EmbeddableMedia) => {
  if (isYouTubeShorts(media.url)) {
    // YouTube Shorts - vertical aspect ratio (9:16)
    return { 
      width: '100%', 
      maxWidth: '315px',
      height: '560px',
      aspectRatio: '9 / 16'
    };
  } else {
    // Regular YouTube video - horizontal aspect ratio (16:9)
    return { 
      width: '100%', 
      maxWidth: '480px', 
      height: '270px',
      aspectRatio: '16 / 9'
    };
  }
};

// Cleanup on unmount (kept for symmetry, currently no-op)
const cleanup = () => {};

// Handle escape key for modal
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showPreview.value) {
    onClosePreview(false);
  }
};

// Add/remove event listeners
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  // Listen for global media play events to stop local media when others start
  window.addEventListener('globalMediaPlay' as any, handleGlobalMediaPlay as any);
});

onUnmounted(() => {
  cleanup();
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('globalMediaPlay' as any, handleGlobalMediaPlay as any);
});

type GlobalMediaDetail = { kind: 'youtube' | 'html5'; id: string };
const handleGlobalMediaPlay = (e: Event) => {
  const ce = e as CustomEvent<GlobalMediaDetail>;
  const detail = ce.detail;
  if (!detail) return;
  if (detail.kind === 'youtube') {
    // If a different YouTube embed started, stop ours
    if (!playingVideos.value.has(detail.id)) {
      playingVideos.value.clear();
    }
    // Always pause any HTML5 videos here
    pauseAllHtml5();
  } else {
    // HTML5 video started elsewhere: stop any YouTube iframes and pause local HTML5 videos
    playingVideos.value.clear();
    pauseAllHtml5(detail.id);
  }
};
</script>

<style scoped>
@reference "@/style.css";

.media-preview {
  @apply transition-transform hover:scale-[1.02];
}

.youtube-embed {
  @apply relative w-full;
}

.youtube-embed iframe {
  @apply block w-full;
  height: auto;
}

/* Unified preview sizing to match attachments */
.preview-media {
  width: 100%;
  max-width: 480px;
  max-height: 270px;
}

/* Override preview-media sizing when playing Shorts to prevent clipping */
.youtube-embed.shorts-playing {
  max-height: none;
}

/* Ensure videos and images don't overflow */
video, img {
  @apply block;
}

.label-badge {
  @apply absolute top-2 left-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded;
}

/* Modal styles */
.fixed {
  backdrop-filter: blur(4px);
}
</style>
