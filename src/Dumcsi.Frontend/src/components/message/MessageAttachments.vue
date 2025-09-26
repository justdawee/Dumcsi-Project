<template>
  <div class="message-attachments mt-2 space-y-2">
    <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="attachment-container relative inline-block group rounded-lg overflow-hidden"
    >
      <div v-if="isImage(attachment)" class="relative border border-border-default/50 rounded-lg overflow-hidden inline-block">
        <div class="label-badge">{{ getAttachmentLabel(attachment) }}</div>
        <img
            :src="urlFor(attachment)"
            :alt="attachment.fileName"
            class="preview-media cursor-pointer"
            @load="notifyMediaLoaded"
            @click="openPreview(attachment)"
        />
      </div>
      <template v-else-if="isVideo(attachment)">
        <div class="relative border border-border-default/50 rounded-lg overflow-hidden inline-block">
          <div class="label-badge">{{ getAttachmentLabel(attachment) }}</div>
          <video
              controls
              class="preview-media"
              @loadedmetadata="notifyMediaLoaded"
          >
            <source :src="urlFor(attachment)" :type="attachment.contentType || undefined" />
          </video>
          <button
              class="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/80 transition"
              @click.stop="openVideoPreview(attachment, $event)"
          >
            <ExternalLink class="w-4 h-4" />
          </button>
        </div>
      </template>
      <div v-else-if="isAudio(attachment)" class="bg-bg-surface border border-border-default rounded-lg p-3 max-w-md relative">
        <div class="label-badge">{{ getAttachmentLabel(attachment) }}</div>
        <div class="flex items-center gap-2 mb-2">
          <ExternalLink class="w-4 h-4 text-text-muted" />
          <span class="text-sm text-text-secondary">{{ t('chat.attachments.labels.audioFile') }}</span>
        </div>
        <audio controls class="w-full">
          <source :src="urlFor(attachment)" :type="attachment.contentType || undefined" />
        </audio>
      </div>
      <a
          v-else
          :href="urlFor(attachment)"
          target="_blank"
          class="flex items-center text-blue-400 hover:underline"
      >
        <File class="w-4 h-4 mr-1" />
        {{ attachment.fileName }} ({{ formatFileSize(attachment.fileSize) }})
      </a>
    </div>
    <AttachmentPreviewModal
        v-if="selected"
        v-model="showPreview"
        :attachment="selected"
        :message="message"
        @update:modelValue="onClose"
    />
  </div>
</template>

<script lang="ts" setup>
import { File, ExternalLink } from 'lucide-vue-next';
import { ref, watch, nextTick } from 'vue';
import type { AttachmentDto, MessageDto } from '@/services/types';
import { formatFileSize } from '@/utils/helpers';
import AttachmentPreviewModal from './AttachmentPreviewModal.vue';

defineProps<{
  attachments: AttachmentDto[];
  message?: MessageDto;
}>();

const notifyMediaLoaded = () => {
  try {
    window.dispatchEvent(new CustomEvent('messageMediaLoaded'));
  } catch {}
};

const isImage = (a: AttachmentDto) => a.contentType?.startsWith('image/');
const isVideo = (a: AttachmentDto) => a.contentType?.startsWith('video/');
const isAudio = (a: AttachmentDto) => a.contentType?.startsWith('audio/');

// Normalize legacy MinIO URLs that referenced the internal hostname
const urlFor = (a: AttachmentDto) => {
  const url = a.fileUrl || '';
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (u.hostname === 'minio' && (u.port === '9000' || !u.port)) {
      return `/s3${u.pathname}${u.search}`;
    }
  } catch {
    // Not an absolute URL; handle bare host form
    if (url.startsWith('minio:9000/')) {
      return `/s3/${url.substring('minio:9000/'.length)}`;
    }
  }
  return url;
};

import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const getAttachmentLabel = (a: AttachmentDto) => {
  if (isImage(a)) {
    if (a.fileName?.toLowerCase().endsWith('.gif') || a.contentType === 'image/gif') return t('chat.attachments.labels.gif');
    return t('chat.attachments.labels.image');
  }
  if (isVideo(a)) return t('chat.attachments.labels.video');
  if (isAudio(a)) return t('chat.attachments.labels.audio');
  return t('chat.attachments.labels.file');
};

const showPreview = ref(false);
const selected = ref<AttachmentDto | null>(null);

const openPreview = (a: AttachmentDto) => {
  selected.value = a;
  nextTick(() => {
    showPreview.value = true;
  });
};

const openVideoPreview = (a: AttachmentDto, e: Event) => {
  const container = (e.currentTarget as HTMLElement).closest('.attachment-container');
  const video = container?.querySelector('video') as HTMLVideoElement | null;
  video?.pause();
  openPreview(a);
};

const onClose = (val: boolean) => {
  showPreview.value = val;
};

watch(showPreview, (open) => {
  if (!open) {
    // Wait for the modal fade-out transition before clearing the selection
    setTimeout(() => {
      selected.value = null;
    }, 200);
  }
});
</script>

<style scoped>
@reference "@/style.css";

.preview-media {
  max-width: 480px;
  max-height: 270px;
}

.label-badge {
  @apply absolute top-2 left-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded;
}
</style>
