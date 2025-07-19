import { ref, onUnmounted, type Ref } from 'vue';
import uploadService from '@/services/uploadService';
import type { UploadResponse } from '@/services/types';
import { useToast } from '@/composables/useToast';
import type { EntityId } from '@/services/types';

// Interface for the attachment state within the composable
export interface Attachment {
  file: File;
  url?: string;
  uploading: boolean;
  progress: number;
  error?: string;
  uploadedId?: number; 
}

export function useAttachments(channelId: Ref<EntityId>) {
  const attachments = ref<Attachment[]>([]);
  const isUploading = ref(false);
  const { addToast } = useToast();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const totalAttachments = attachments.value.length + files.length;
    if (totalAttachments > 10) {
      addToast({
        type: 'warning',
        message: 'You can only attach up to 10 files per message.',
      });
      return;
    }

    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        addToast({ type: 'danger', message: `File "${file.name}" is too large (max 50MB).` });
        continue;
      }

      attachments.value.push({
        file,
        url: uploadService.isImage(file) ? uploadService.generatePreviewUrl(file) : undefined,
        uploading: false,
        progress: 0,
      });
    }
  };

  const removeAttachment = (index: number) => {
    const attachment = attachments.value[index];
    if (attachment?.url) {
      uploadService.revokePreviewUrl(attachment.url);
    }
    attachments.value.splice(index, 1);
  };

  const uploadAttachments = async (): Promise<number[]> => {
    if (attachments.value.length === 0) return [];

    isUploading.value = true;
    const uploadedIds: number[] = [];

    const uploadPromises = attachments.value.map(async (attachment) => {
      if (attachment.error) return; // Hibás fájlok kihagyása
      attachment.uploading = true;
      try {
        const response: UploadResponse = await uploadService.uploadAttachment(channelId.value, attachment.file, {
          onProgress: (progress) => {
            attachment.progress = progress;
          },
        });
        // A backend válaszából kinyerjük a feltöltött fájl ID-ját
        uploadedIds.push(response.id);
      } catch (error: any) {
        attachment.error = 'Upload failed';
        addToast({ type: 'danger', message: `Failed to upload ${attachment.file.name}` });
        // Nem dobunk hibát, hogy a többi feltöltés folytatódhasson
      } finally {
        attachment.uploading = false;
      }
    });

    try {
      await Promise.all(uploadPromises);
    } finally {
      isUploading.value = false;
    }

    // Csak a sikeresen feltöltött fájlok ID-jait adjuk vissza
    return uploadedIds;
  };

  const clearAttachments = () => {
    attachments.value.forEach(a => {
      if (a.url) uploadService.revokePreviewUrl(a.url);
    });
    attachments.value = [];
  };

  onUnmounted(() => {
    clearAttachments();
  });

  return {
    attachments,
    isUploading,
    handleFileSelect,
    removeAttachment,
    uploadAttachments,
    clearAttachments,
  };
}