import api from './api';
import type {
    ApiResponse,
    EntityId,
    UploadOptions,
    UploadResponse
} from './types';
import type {AxiosError, AxiosProgressEvent} from 'axios';

/**
 * Egyedi hiba osztály a feltöltési hibák kezelésére.
 */
export class UploadError extends Error {
    constructor(public code: string, message: string) {
        super(message);
        this.name = 'UploadError';
    }
}

/**
 * Service fájlfeltöltések kezelésére.
 * Kezeli az avatar, szerver ikon, emoji és üzenet melléklet feltöltéseket.
 */
class UploadService {
    // Maximális fájlméretek
    private readonly MAX_AVATAR_SIZE = 8 * 1024 * 1024; // 8MB
    private readonly MAX_SERVER_ICON_SIZE = 8 * 1024 * 1024; // 8MB
    private readonly MAX_EMOJI_SIZE = 256 * 1024; // 256KB
    private readonly MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB

    // Elfogadott képformátumok
    private readonly ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    /**
     * Ellenőrzi, hogy a fájl kép-e.
     */
    isImage(file: File): boolean {
        return this.ACCEPTED_IMAGE_TYPES.includes(file.type);
    }

    /**
     * Létrehoz egy előnézeti URL-t a fájlhoz.
     */
    generatePreviewUrl(file: File): string {
        return URL.createObjectURL(file);
    }

    /**
     * Felszabadít egy előnézeti URL-t.
     */
    revokePreviewUrl(url: string): void {
        URL.revokeObjectURL(url);
    }

    /**
     * Ellenőrzi a fájl érvényességét (méret és típus).
     */
    private validateImage(file: File, maxSize: number): void {
        if (!this.isImage(file)) {
            throw new UploadError('INVALID_FILE_TYPE', 'Only JPEG, PNG, GIF and WebP images are allowed');
        }
        if (file.size > maxSize) {
            const maxSizeMB = Math.round(maxSize / 1024 / 1024);
            throw new UploadError('FILE_TOO_LARGE', `File size must be less than ${maxSizeMB}MB`);
        }
    }

    /**
     * ApiResponse hiba objektumot UploadError-rá alakít.
     */
    private throwUploadError(errorResponse: ApiResponse): never {
        throw new UploadError(
            errorResponse.error?.code || 'UNKNOWN_ERROR',
            errorResponse.error?.message || errorResponse.message || 'Upload failed'
        );
    }

    /**
     * Univerzális privát metódus a fájlfeltöltések kezelésére, ami a teljes UploadResponse objektumot adja vissza.
     */
    private async upload<T>(
        endpoint: string,
        file: File,
        formDataAppender?: (fd: FormData) => void,
        options?: UploadOptions
    ): Promise<T> {
        const formData = new FormData();
        formData.append('file', file);
        formDataAppender?.(formData);

        try {
            const response = await api.post<ApiResponse<T>>(endpoint, formData, {
                headers: {'Content-Type': 'multipart/form-data'},
                onUploadProgress: options?.onProgress && ((progressEvent: AxiosProgressEvent) => {
                    if (progressEvent.total) {
                        options.onProgress?.(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                    }
                }),
            });

            if (!response.data.isSuccess) {
                this.throwUploadError(response.data);
            }

            return response.data.data;
        } catch (error) {
            if (error instanceof UploadError) {
                throw error;
            }

            const axiosError = error as AxiosError<ApiResponse>;
            if (axiosError.response?.data) {
                this.throwUploadError(axiosError.response.data);
            }

            throw new UploadError('NETWORK_ERROR', 'Network error occurred');
        }
    }

    // --- NYILVÁNOS METÓDUSOK ---

    /**
     * Feltölt egy avatar képet. A backend itt csak egy { url: '...' } objektumot ad vissza.
     */
    async uploadAvatar(file: File, options?: UploadOptions): Promise<{ url: string }> {
        this.validateImage(file, this.MAX_AVATAR_SIZE);
        return this.upload<{ url: string }>('/user/me/avatar', file, undefined, options);
    }

    /**
     * Feltölt egy szerver ikon képet. A backend itt is csak egy { url: '...' } objektumot ad vissza.
     */
    async uploadServerIcon(serverId: EntityId, file: File, options?: UploadOptions): Promise<{ url: string }> {
        this.validateImage(file, this.MAX_SERVER_ICON_SIZE);
        return this.upload<{ url: string }>(`/server/${serverId}/icon`, file, undefined, options);
    }

    /**
     * Feltölt egy egyedi emoji képet.
     */
    async uploadEmoji(serverId: EntityId, file: File, emojiName: string, options?: UploadOptions): Promise<UploadResponse> {
        this.validateImage(file, this.MAX_EMOJI_SIZE);

        return this.upload<UploadResponse>(
            `/server/${serverId}/emojis`,
            file,
            (formData) => {
                formData.append('name', emojiName);
            },
            options
        );
    }

    /**
     * Feltölt egy üzenet mellékletet.
     */
    async uploadAttachment(channelId: EntityId, file: File, options?: UploadOptions): Promise<UploadResponse> {
        if (file.size > this.MAX_ATTACHMENT_SIZE) {
            throw new UploadError('FILE_TOO_LARGE', 'File size must be less than 50MB');
        }

        return this.upload<UploadResponse>(`/channels/${channelId}/attachments`, file, undefined, options);
    }

    /**
     * Feltölt egy DM üzenet mellékletet.
     */
    async uploadDmAttachment(userId: EntityId, file: File, options?: UploadOptions): Promise<UploadResponse> {
        if (file.size > this.MAX_ATTACHMENT_SIZE) {
            throw new UploadError('FILE_TOO_LARGE', 'File size must be less than 50MB');
        }

        return this.upload<UploadResponse>(`/dm/${userId}/attachments`, file, undefined, options);
    }

    /**
     * Törli a felhasználó avatar képét.
     */
    async deleteAvatar(): Promise<void> {
        const response = await api.delete<ApiResponse<void>>('/user/me/avatar');
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    }

    /**
     * Törli a szerver ikon képét.
     */
    async deleteServerIcon(serverId: EntityId): Promise<void> {
        const response = await api.delete<ApiResponse<void>>(`/server/${serverId}/icon`);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    }
}

// Singleton instance
const uploadService = new UploadService();
export default uploadService;
