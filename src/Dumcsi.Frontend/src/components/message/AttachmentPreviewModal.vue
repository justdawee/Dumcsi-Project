<template>
  <BaseModal
      :model-value="modelValue"
      @update:modelValue="$emit('update:modelValue', $event)"
      :title="attachment.fileName"
      size="full"
      close-label="Close preview"
  >
    <div class="flex items-center justify-center bg-black/80 p-4 max-h-[80vh]">
      <img
          v-if="isImage(attachment)"
          :src="attachment.fileUrl"
          :alt="attachment.fileName"
          class="max-h-[80vh] max-w-full object-contain"
      />
      <video
          v-else-if="isVideo(attachment)"
          controls
          class="max-h-[80vh] max-w-full"
      >
        <source :src="attachment.fileUrl" :type="attachment.contentType || undefined" />
      </video>
      <audio v-else-if="isAudio(attachment)" controls class="w-full">
        <source :src="attachment.fileUrl" :type="attachment.contentType || undefined" />
      </audio>
      <a v-else :href="attachment.fileUrl" target="_blank" class="text-blue-400 hover:underline">
        Download file
      </a>
    </div>
  </BaseModal>
</template>

<script lang="ts" setup>
import BaseModal from '@/components/modals/BaseModal.vue';
import type { AttachmentDto } from '@/services/types';

defineProps<{
  modelValue: boolean;
  attachment: AttachmentDto;
}>();
defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const isImage = (a: AttachmentDto) => a.contentType?.startsWith('image/');
const isVideo = (a: AttachmentDto) => a.contentType?.startsWith('video/');
const isAudio = (a: AttachmentDto) => a.contentType?.startsWith('audio/');
</script>