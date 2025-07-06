import api from './api';
import type { UploadResponse } from './types';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxSizeInMB?: number;
  allowedTypes?: string[];
}

class UploadService {
  // File size limits (in MB)
  private readonly limits = {
    avatar: 5,
    serverIcon: 5,
    emoji: 2,
    attachment: 25
  };

  // Allowed file types
  private readonly allowedTypes = {
    avatar: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    serverIcon: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    emoji: ['image/png', 'image/gif', 'image/webp'],
    attachment: [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/ogg', 'audio/wav',
      'application/pdf', 'text/plain',
      'application/zip', 'application/x-rar-compressed'
    ]
  };

  /**
   * Validates file before upload
   */
  private validateFile(file: File, type: keyof typeof this.limits, options?: UploadOptions): void {
    // Check file size
    const maxSize = (options?.maxSizeInMB || this.limits[type]) * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${options?.maxSizeInMB || this.limits[type]}MB limit`);
    }

    // Check file type
    const allowedTypes = options?.allowedTypes || this.allowedTypes[type];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  /**
   * Creates FormData and configures upload request
   */
  private createFormData(file: File, additionalData?: Record<string, any>): FormData {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return formData;
  }

  /**
   * Uploads user avatar
   */
  async uploadAvatar(file: File, options?: UploadOptions): Promise<UploadResponse> {
    this.validateFile(file, 'avatar', options);
    
    const formData = this.createFormData(file);
    
    const response = await api.post<UploadResponse>('/user/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
          };
          options.onProgress(progress);
        }
      }
    });
    
    return response.data;
  }

  /**
   * Uploads server icon
   */
  async uploadServerIcon(serverId: number, file: File, options?: UploadOptions): Promise<UploadResponse> {
    this.validateFile(file, 'serverIcon', options);
    
    const formData = this.createFormData(file);
    
    const response = await api.post<UploadResponse>(`/server/${serverId}/icon`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
          };
          options.onProgress(progress);
        }
      }
    });
    
    return response.data;
  }

  /**
   * Uploads custom emoji
   */
  async uploadEmoji(serverId: number, file: File, name: string, options?: UploadOptions): Promise<UploadResponse> {
    this.validateFile(file, 'emoji', options);
    
    if (!name || name.length < 2 || name.length > 32) {
      throw new Error('Emoji name must be between 2 and 32 characters');
    }
    
    const formData = this.createFormData(file, { name });
    
    const response = await api.post<UploadResponse>(`/server/${serverId}/emojis`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
          };
          options.onProgress(progress);
        }
      }
    });
    
    return response.data;
  }

  /**
   * Uploads message attachment
   */
  async uploadAttachment(channelId: number, file: File, options?: UploadOptions): Promise<UploadResponse> {
    this.validateFile(file, 'attachment', options);
    
    const formData = this.createFormData(file);
    
    const response = await api.post<UploadResponse>(`/channels/${channelId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
          };
          options.onProgress(progress);
        }
      }
    });
    
    return response.data;
  }

  /**
   * Uploads multiple attachments
   */
  async uploadAttachments(
    channelId: number, 
    files: File[], 
    options?: UploadOptions & { onFileProgress?: (fileIndex: number, progress: UploadProgress) => void }
  ): Promise<UploadResponse[]> {
    const results: UploadResponse[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadOptions: UploadOptions = {
        ...options,
        onProgress: options?.onFileProgress 
          ? (progress) => options.onFileProgress!(i, progress)
          : options?.onProgress
      };
      
      try {
        const result = await this.uploadAttachment(channelId, file, uploadOptions);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Deletes uploaded avatar
   */
  async deleteAvatar(): Promise<void> {
    await api.delete('/user/me/avatar');
  }

  /**
   * Deletes server icon
   */
  async deleteServerIcon(serverId: number): Promise<void> {
    await api.delete(`/server/${serverId}/icon`);
  }

  /**
   * Helper to get file preview URL
   */
  getFilePreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Helper to revoke file preview URL (to prevent memory leaks)
   */
  revokeFilePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Helper to format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
const uploadService = new UploadService();
export default uploadService;

// Export class and types for testing
export { UploadService, type UploadProgress, type UploadOptions };