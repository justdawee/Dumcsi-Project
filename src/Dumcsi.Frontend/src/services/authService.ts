import { api } from './api'
import type { 
  AuthResponse, 
  LoginRequestDto, 
  RegisterRequestDto, 
  RefreshTokenRequestDto 
} from '@/types'

export const authService = {
  async register(data: RegisterRequestDto): Promise<AuthResponse> {
    return api.post<AuthResponse>('/Auth/register', data)
  },

  async login(data: LoginRequestDto): Promise<AuthResponse> {
    return api.post<AuthResponse>('/Auth/login', data)
  },

  async refreshToken(data: RefreshTokenRequestDto): Promise<AuthResponse> {
    return api.post<AuthResponse>('/Auth/refresh', data)
  }
}