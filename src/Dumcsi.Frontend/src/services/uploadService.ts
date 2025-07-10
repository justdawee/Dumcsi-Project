import api from './api';
import type {AxiosError, AxiosProgressEvent} from 'axios';
import type {ApiResponse, EntityId} from './types';

interface UploadOptions {
    onProgress?: (progress: number) => void;
}

export interface UploadResponse {
    id?: EntityId;
    url: string;
    fileName?: string;
    fileSize?: number;
}

class UploadError extends Error {
    constructor(public code: string, message: string) {
        super(message);
        this.name = 'UploadError';
    }
}

class UploadService {
    // Maximum file sizes (in bytes)
    private readonly MAX_AVATAR_SIZE = 10 * 1024 * 1024; // 10MB
    private readonly MAX_SERVER_ICON_SIZE = 10 * 1024 * 1024; // 10MB
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
     * Központi hibakezelő, ami a hibákat az errorHandler által értelmezhető formátumba csomagolja.
     * Ez utánozza az Axios által dobott hibaobjektum struktúráját.
     * @param errorData A hibaadat, ami lehet egy teljes ApiResponse vagy csak egy hibakód.
     */
    private handleError(errorData: Partial<ApiResponse> | { code: string }) {
        let apiResponse: ApiResponse;

        if ('code' in errorData) {
            // Kliens oldali validációs hibákhoz, ahol csak egy hibakódunk van.
            apiResponse = {
                isSuccess: false,
                data: null,
                message: '',
                error: {
                    code: errorData.code,
                    message: '' // Az üzenetet az en.ts fájlból fogja kikeresni az errorHandler.
                }
            };
        } else {
            // Szerver oldali hibákhoz, ahol a teljes ApiResponse objektum rendelkezésre áll.
            apiResponse = errorData as ApiResponse;
        }

        throw {response: {data: apiResponse}};
    }

    /**
     * Univerzális privát metódus a fájlfeltöltések kezelésére.
     * @param endpoint A cél API végpont.
     * @param file A feltöltendő fájl.
     * @param formDataAppender Opcionális függvény további adatok FormData-hoz adásához.
     * @param options Feltöltési opciók, mint pl. a progress callback.
     * @returns A szerver válasza a feltöltésről.
     */
    private async upload(
        endpoint: string,
        file: File,
        formDataAppender?: (fd: FormData) => void,
        options?: UploadOptions
    ): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formDataAppender?.(formData);

        try {
            const response = await api.post<ApiResponse<UploadResponse>>(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
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

    private throwUploadError(errorResponse: ApiResponse): never {
        throw new UploadError(
            errorResponse.error?.code || 'UNKNOWN_ERROR',
            errorResponse.error?.message || errorResponse.message || 'Upload failed'
        );
    }

    // --- NYILVÁNOS METÓDUSOK ---

    async uploadAvatar(file: File, options?: UploadOptions): Promise<UploadResponse> {
        this.validateImage(file, this.MAX_AVATAR_SIZE);
        return this.upload('/user/me/avatar', file, undefined, options);
    }

    async uploadServerIcon(serverId: EntityId, file: File, options?: UploadOptions): Promise<UploadResponse> {
        this.validateImage(file, this.MAX_SERVER_ICON_SIZE);
        return this.upload(`/server/${serverId}/icon`, file, undefined, options);
    }

    async uploadEmoji(serverId: EntityId, file: File, emojiName: string, options?: UploadOptions): Promise<UploadResponse> {
        this.validateImage(file, this.MAX_EMOJI_SIZE);
        return this.upload(`/server/${serverId}/emojis`, file, (fd) => fd.append('name', emojiName), options);
    }

    async uploadAttachment(channelId: EntityId, file: File, options?: UploadOptions): Promise<UploadResponse> {
        this.validateAttachment(file);
        return this.upload(`/channels/${channelId}/attachments`, file, undefined, options);
    }

    // --- VALIDÁCIÓ ÉS SEGÉDFÜGGVÉNYEK ---

    private validateImage(file: File, maxSize: number): void {
        if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            this.handleError({code: 'AVATAR_INVALID_FILE_TYPE'});
        }
        if (file.size > maxSize) {
            this.handleError({code: 'AVATAR_FILE_TOO_LARGE'});
        }
    }

    private validateAttachment(file: File): void {
        if (!this.ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
            this.handleError({code: 'ATTACHMENT_INVALID_FILE_TYPE'});
        }
        if (file.size > this.MAX_ATTACHMENT_SIZE) {
            this.handleError({code: 'ATTACHMENT_FILE_TOO_LARGE'}); // Ehhez is kellhet új kód.
        }
    }

    generatePreviewUrl(file: File): string {
        return URL.createObjectURL(file);
    }

    revokePreviewUrl(url: string): void {
        URL.revokeObjectURL(url);
    }

    isImage(file: File): boolean {
        return this.ALLOWED_IMAGE_TYPES.includes(file.type);
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

export default new UploadService();
