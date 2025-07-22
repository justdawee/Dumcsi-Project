<template>
  <div class="message-attachments mt-2 space-y-2">
    <div v-for="attachment in attachments" :key="attachment.id">
      <img
          v-if="isImage(attachment)"
          :src="attachment.fileUrl"
          :alt="attachment.fileName"
          class="max-w-full rounded-lg"
      />
      <video
          v-else-if="isVideo(attachment)"
          controls
          class="max-w-full rounded-lg"
      >
        <source :src="attachment.fileUrl" :type="attachment.contentType || undefined" />
      </video>
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
  </div>
</template>

<script lang="ts" setup>
import { File } from 'lucide-vue-next';
import type { AttachmentDto } from '@/services/types';
import { formatFileSize } from '@/utils/helpers';

defineProps<{
  attachments: AttachmentDto[];
}>();

const isImage = (a: AttachmentDto) => a.contentType?.startsWith('image/');
const isVideo = (a: AttachmentDto) => a.contentType?.startsWith('video/');
const isAudio = (a: AttachmentDto) => a.contentType?.startsWith('audio/');
</script>

<style scoped>
.message-attachments img,
.message-attachments video {
  max-height: 480px;
}
</style>