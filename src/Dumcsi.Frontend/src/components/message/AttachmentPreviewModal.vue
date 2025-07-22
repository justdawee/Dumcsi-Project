<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
          v-if="modelValue"
          class="fixed inset-0 z-[100] flex items-center justify-center"
          @click.self="handleBackdropClick"
      >
        <!-- Dark backdrop -->
        <div class="absolute inset-0 bg-black/90"></div>

        <!-- Preview container -->
        <div class="relative flex flex-col h-full w-full">
          <!-- Header -->
          <div class="relative z-10 flex items-center justify-between p-4">
            <!-- Left side: User info -->
            <div class="flex items-center gap-3">
              <UserAvatar
                  v-if="message"
                  :username="message.author.username"
                  :avatar-url="message.author.avatar"
                  :size="32"
              />
              <div v-if="message" class="text-white">
                <div class="font-medium">{{ getDisplayName(message.author) }}</div>
                <div class="text-xs text-gray-400">{{ formatMessageTime(message.timestamp) }}</div>
              </div>
            </div>

            <!-- Right side: Actions -->
            <div class="flex items-center gap-2">
              <!-- Zoom controls for images -->
              <template v-if="isImage(attachment)">
                <button
                    class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
                    title="Zoom in"
                    @click="zoomIn"
                >
                  <ZoomIn class="w-5 h-5" />
                </button>
                <button
                    class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
                    title="Zoom out"
                    @click="zoomOut"
                >
                  <ZoomOut class="w-5 h-5" />
                </button>
                <button
                    v-if="zoomLevel !== 1"
                    class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
                    title="Reset zoom"
                    @click="resetZoom"
                >
                  <Minimize2 class="w-5 h-5" />
                </button>
              </template>

              <!-- Download button -->
              <button
                  class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
                  title="Download"
                  @click="downloadFile"
              >
                <Download class="w-5 h-5" />
              </button>

              <!-- Open in browser -->
              <a
                  :href="attachment.fileUrl"
                  target="_blank"
                  class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
                  title="Open in browser"
              >
                <ExternalLink class="w-5 h-5" />
              </a>

              <!-- More options menu -->
              <div class="relative">
                <button
                    class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
                    title="More options"
                    @click="showMoreMenu = !showMoreMenu"
                >
                  <MoreVertical class="w-5 h-5" />
                </button>

                <!-- Dropdown menu -->
                <Transition name="dropdown">
                  <div
                      v-if="showMoreMenu"
                      v-click-outside="() => showMoreMenu = false"
                      class="absolute right-0 mt-2 w-48 bg-bg-surface rounded-lg shadow-xl border border-border-default py-1 z-20"
                  >
                    <button
                        v-if="isImage(attachment)"
                        class="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-main-700 hover:text-text-default transition flex items-center gap-2"
                        @click="copyImage"
                    >
                      <Copy class="w-4 h-4" />
                      Copy Image
                    </button>
                    <button
                        class="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-main-700 hover:text-text-default transition flex items-center gap-2"
                        @click="copyLink"
                    >
                      <Link class="w-4 h-4" />
                      Copy Link
                    </button>
                    <div class="h-px bg-border-default my-1"></div>
                    <button
                        class="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-main-700 hover:text-text-default transition flex items-center gap-2"
                        @click="showDetails = true"
                    >
                      <Info class="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </Transition>
              </div>

              <!-- Close button -->
              <button
                  class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition ml-2"
                  title="Close"
                  @click="close"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Content area -->
          <div class="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <div
                v-if="isImage(attachment)"
                class="relative flex items-center justify-center w-full h-full max-w-full max-h-full"
                :style="{
                  transform: `scale(${zoomLevel}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s',
                  cursor: zoomLevel > 1 ? 'move' : 'default',
                  'transform-origin': 'center'
                }"
                @wheel.prevent="onWheel"
            >
              <img
                  :src="attachment.fileUrl"
                  :alt="attachment.fileName"
                  class="max-w-full max-h-full object-contain"
                  draggable="false"
                  @mousedown="startDrag"
                  @mousemove="onDrag"
                  @mouseup="endDrag"
                  @mouseleave="endDrag"
              />
            </div>
            <video
                v-else-if="isVideo(attachment)"
                controls
                class="max-h-[80vh] max-w-full"
            >
              <source :src="attachment.fileUrl" :type="attachment.contentType || undefined" />
            </video>
            <audio v-else-if="isAudio(attachment)" controls class="w-full max-w-lg">
              <source :src="attachment.fileUrl" :type="attachment.contentType || undefined" />
            </audio>
            <div v-else class="text-center">
              <File class="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p class="text-white mb-4">{{ attachment.fileName }}</p>
              <button
                  class="btn-primary"
                  @click="downloadFile"
              >
                Download File
              </button>
            </div>
          </div>
        </div>

        <!-- Details Modal -->
        <Transition name="modal-fade">
          <div
              v-if="showDetails"
              class="fixed inset-0 z-[110] flex items-center justify-center p-4"
              @click.self="showDetails = false"
          >
            <div class="bg-bg-surface rounded-lg p-6 max-w-sm w-full shadow-xl">
              <h3 class="text-lg font-semibold text-text-default mb-4">File Details</h3>
              <dl class="space-y-3">
                <div>
                  <dt class="text-sm text-text-tertiary">Filename</dt>
                  <dd class="text-sm text-text-secondary break-all">{{ attachment.fileName }}</dd>
                </div>
                <div>
                  <dt class="text-sm text-text-tertiary">Size</dt>
                  <dd class="text-sm text-text-secondary">{{ formatFileSize(attachment.fileSize) }}</dd>
                </div>
                <div v-if="attachment.contentType">
                  <dt class="text-sm text-text-tertiary">Type</dt>
                  <dd class="text-sm text-text-secondary">{{ attachment.contentType }}</dd>
                </div>
                <div v-if="isImage(attachment) && (attachment.width || attachment.height)">
                  <dt class="text-sm text-text-tertiary">Dimensions</dt>
                  <dd class="text-sm text-text-secondary">{{ attachment.width }} × {{ attachment.height }} pixels</dd>
                </div>
                <div v-if="isVideo(attachment) && attachment.duration">
                  <dt class="text-sm text-text-tertiary">Duration</dt>
                  <dd class="text-sm text-text-secondary">{{ formatDuration(attachment.duration) }}</dd>
                </div>
              </dl>
              <button
                  class="btn-secondary w-full mt-6"
                  @click="showDetails = false"
              >
                Close
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import {
  X, Download, ExternalLink, MoreVertical, Copy, Link, Info, File,
  ZoomIn, ZoomOut, Minimize2
} from 'lucide-vue-next';
import UserAvatar from '@/components/common/UserAvatar.vue';
import type { AttachmentDto, MessageDto } from '@/services/types';
import { formatFileSize } from '@/utils/helpers';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  modelValue: boolean;
  attachment: AttachmentDto;
  message?: MessageDto; // Optional for backward compatibility
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { addToast } = useToast();

// State
const showMoreMenu = ref(false);
const showDetails = ref(false);
const zoomLevel = ref(1);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const imagePosition = ref({ x: 0, y: 0 });

// Computed
const isImage = (a: AttachmentDto) => a.contentType?.startsWith('image/');
const isVideo = (a: AttachmentDto) => a.contentType?.startsWith('video/');
const isAudio = (a: AttachmentDto) => a.contentType?.startsWith('audio/');

// Methods
const close = () => {
  emit('update:modelValue', false);
};

const handleBackdropClick = () => {
  if (!showDetails.value) {
    close();
  }
};

const downloadFile = () => {
  const link = document.createElement('a');
  link.href = props.attachment.fileUrl;
  link.download = props.attachment.fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const copyImage = async () => {
  if (!isImage(props.attachment)) return;

  try {
    // Check if clipboard API is available
    if (!navigator.clipboard || !window.ClipboardItem) {
      addToast({ type: 'warning', message: 'Clipboard API not supported in your browser' });
      return;
    }

    const response = await fetch(props.attachment.fileUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    addToast({ type: 'success', message: 'Image copied to clipboard' });
    showMoreMenu.value = false;
  } catch (error) {
    console.error('Failed to copy image:', error);
    addToast({ type: 'danger', message: 'Failed to copy image. Try right-clicking the image instead.' });
  }
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(props.attachment.fileUrl);
    addToast({ type: 'success', message: 'Link copied to clipboard' });
    showMoreMenu.value = false;
  } catch (error) {
    addToast({ type: 'danger', message: 'Failed to copy link' });
  }
};

// Zoom functions
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 0.5);
};

const resetZoom = () => {
  zoomLevel.value = 1;
  imagePosition.value = { x: 0, y: 0 };
};

// Wheel zoom handler
const onWheel = (e: WheelEvent) => {
  if (!isImage(props.attachment)) return;
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.1 : -0.1;
  const newZoom = zoomLevel.value + delta;
  zoomLevel.value = Math.min(3, Math.max(0.5, newZoom));
};

// Drag functions
const startDrag = (e: MouseEvent) => {
  if (zoomLevel.value > 1) {
    isDragging.value = true;
    dragStart.value = {
      x: e.clientX - imagePosition.value.x,
      y: e.clientY - imagePosition.value.y
    };
  }
};

const onDrag = (e: MouseEvent) => {
  if (isDragging.value) {
    imagePosition.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y
    };
  }
};

const endDrag = () => {
  isDragging.value = false;
};

// Helper functions
const getDisplayName = (author: { username: string; globalNickname?: string | null }) => {
  return author.globalNickname || author.username;
};

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

  const time = date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: false});

  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }) + ` at ${time}`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Keyboard handler
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    if (showDetails.value) {
      showDetails.value = false;
    } else {
      close();
    }
  }
};

// Click outside directive
const vClickOutside = {
  mounted(
      el: HTMLElement & { _clickOutsideHandler?: (e: MouseEvent) => void },
      binding: any
  ) {
    el._clickOutsideHandler = (event: MouseEvent) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value();
      }
    };
    document.addEventListener('click', el._clickOutsideHandler);
  },
  unmounted(el: HTMLElement & { _clickOutsideHandler?: (e: MouseEvent) => void }) {
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler);
    }
  },
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Modal transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Dropdown transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Scrollbar */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}
</style>