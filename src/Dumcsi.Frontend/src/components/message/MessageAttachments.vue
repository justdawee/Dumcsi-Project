<template>
  <div class="message-attachments mt-2 space-y-2">
    <div
        v-for="attachment in attachments"
        :key="attachment.id"
        class="attachment-container relative inline-block group"
    >
      <img
          v-if="isImage(attachment)"
          :src="attachment.fileUrl"
          :alt="attachment.fileName"
          class="preview-media rounded-lg cursor-pointer"
          @click="openPreview(attachment)"
      />
      <template v-else-if="isVideo(attachment)">
        <video
            controls
            class="preview-media rounded-lg"
        >
          <source :src="attachment.fileUrl" :type="attachment.contentType || undefined" />
        </video>
        <button
            class="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/80 transition"
            @click.stop="openVideoPreview(attachment, $event)"
        >
          <ExternalLink class="w-4 h-4" />
        </button>
      </template>
      <audio v-else-if="isAudio(attachment)" controls class="w-full">
        <source :src="attachment.fileUrl" :type="attachment.contentType || undefined" />
      </audio>
      <a
          v-else
          :href="attachment.fileUrl"
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

const isImage = (a: AttachmentDto) => a.contentType?.startsWith('image/');
const isVideo = (a: AttachmentDto) => a.contentType?.startsWith('video/');
const isAudio = (a: AttachmentDto) => a.contentType?.startsWith('audio/');

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
.preview-media {
  max-width: 400px;
  max-height: 240px;
}
</style>