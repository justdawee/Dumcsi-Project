import api from './api';
import type { AxiosProgressEvent } from 'axios';

interface UploadOptions {
  onProgress?: (progress: number) => void;
}

export interface UploadResponse {
  id: number;
  url: string;
  fileName?: string;
  fileSize?: number;
}

class UploadService {
  // Maximum file sizes (in bytes)
  private readonly MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_SERVER_ICON_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_EMOJI_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB

  // Allowed file types
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly ALLOWED_ATTACHMENT_TYPES = [
    ...this.ALLOWED_IMAGE_TYPES,
    'application/pdf',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/webm'
  ];

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File, options?: UploadOptions): Promise<UploadResponse> {
    this.validateImage(file, this.MAX_AVATAR_SIZE, 'Avatar');
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>('/user/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * Upload server icon
   */
  async uploadServerIcon(serverId: number, file: File, options?: UploadOptions): Promise<UploadResponse> {
    this.validateImage(file, this.MAX_SERVER_ICON_SIZE, 'Server icon');
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>(`/server/${serverId}/icon`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * Upload custom emoji
   */
  async uploadEmoji(serverId: number, file: File, emojiName: string, options?: UploadOptions): Promise<UploadResponse> {
    this.validateImage(file, this.MAX_EMOJI_SIZE, 'Emoji');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', emojiName);

    const response = await api.post<UploadResponse>(`/server/${serverId}/emojis`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * Upload message attachment
   */
  async uploadAttachment(channelId: number, file: File, options?: UploadOptions): Promise<UploadResponse> {
    this.validateAttachment(file);
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<UploadResponse>(`/channels/${channelId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * Upload multiple attachments
   */
  async uploadAttachments(
    channelId: number, 
    files: File[], 
    options?: UploadOptions
  ): Promise<UploadResponse[]> {
    const uploadPromises = files.map((file, index) => 
      this.uploadAttachment(channelId, file, {
        onProgress: (progress) => {
          if (options?.onProgress) {
            // Calculate overall progress
            const overallProgress = files.reduce((sum, _, i) => {
              if (i < index) return sum + 100;
              if (i === index) return sum + progress;
              return sum;
            }, 0) / files.length;
            options.onProgress(Math.round(overallProgress));
          }
        }
      })
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Validate image file
   */
  private validateImage(file: File, maxSize: number, fileType: string): void {
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`${fileType} must be an image (JPEG, PNG, GIF, or WebP)`);
    }

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new Error(`${fileType} must be less than ${maxSizeMB}MB`);
    }

    // Additional validation for image dimensions could be added here
    // This would require reading the image with FileReader and Image APIs
  }

  /**
   * Validate attachment file
   */
  private validateAttachment(file: File): void {
    if (!this.ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      throw new Error('File type not allowed. Please check supported file types.');
    }

    if (file.size > this.MAX_ATTACHMENT_SIZE) {
      throw new Error('File must be less than 50MB');
    }
  }

  /**
   * Generate a preview URL for a file
   */
  generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Revoke a preview URL to free memory
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Check if a file is an image
   */
  isImage(file: File): boolean {
    return this.ALLOWED_IMAGE_TYPES.includes(file.type);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new UploadService();