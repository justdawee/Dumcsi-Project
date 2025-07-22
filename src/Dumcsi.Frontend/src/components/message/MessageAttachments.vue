<template>
  <div class="message-attachments mt-2 space-y-2">
    <div v-for="attachment in attachments" :key="attachment.id">
      <img
          v-if="isImage(attachment)"
          :src="attachment.fileUrl"
          :alt="attachment.fileName"
          class="preview-media rounded-lg cursor-pointer"
          @click="openPreview(attachment)"
      />
      <video
          v-else-if="isVideo(attachment)"
          controls
          class="preview-media rounded-lg cursor-pointer"
          @click="openPreview(attachment)"
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
    <AttachmentPreviewModal
        v-if="selected && showPreview"
        v-model="showPreview"
        :attachment="selected"
        @update:modelValue="onClose"
    />
  </div>
</template>

<script lang="ts" setup>
import { File } from 'lucide-vue-next';
import { ref, watch } from 'vue';
import type { AttachmentDto } from '@/services/types';
import { formatFileSize } from '@/utils/helpers';
import AttachmentPreviewModal from './AttachmentPreviewModal.vue';

defineProps<{
  attachments: AttachmentDto[];
}>();

const isImage = (a: AttachmentDto) => a.contentType?.startsWith('image/');
const isVideo = (a: AttachmentDto) => a.contentType?.startsWith('video/');
const isAudio = (a: AttachmentDto) => a.contentType?.startsWith('audio/');

const showPreview = ref(false);
const selected = ref<AttachmentDto | null>(null);

const openPreview = (a: AttachmentDto) => {
  selected.value = a;
  showPreview.value = true;
};

const onClose = (val: boolean) => {
  showPreview.value = val;
};

watch(showPreview, (open) => {
  if (!open) selected.value = null;
});
</script>

<style scoped>
.preview-media {
  max-width: 400px;
  max-height: 240px;
}
</style>