import api from './api';
import type {
    LoginRequestDto,
    RegisterRequestDto,
    RefreshTokenRequestDto,
    TokenResponseDto,
    ApiResponse
} from './types';

const authService = {
    async register(payload: RegisterRequestDto): Promise<void> {
        const response = await api.post<ApiResponse<void>>('/auth/register', payload);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
    },

    async login(payload: LoginRequestDto): Promise<TokenResponseDto> {
        const response = await api.post<ApiResponse<TokenResponseDto>>('/auth/login', payload);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },

    async refresh(payload: RefreshTokenRequestDto): Promise<TokenResponseDto> {
        const response = await api.post<ApiResponse<TokenResponseDto>>('/auth/refresh', payload);
        if (!response.data.isSuccess) {
            throw new Error(response.data.message);
        }
        return response.data.data;
    },
};

export default authService;