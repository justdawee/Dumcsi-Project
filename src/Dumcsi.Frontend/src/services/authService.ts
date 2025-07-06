import api from './api';
import type { LoginPayload, RegisterPayload, TokenResponse } from './types';

const authService = {
  register(payload: RegisterPayload): Promise<void> {
    return api.post('/auth/register', payload).then(res => res.data);
  },

  login(payload: LoginPayload): Promise<TokenResponse> {
    return api.post<TokenResponse>('/auth/login', payload).then(res => res.data);
  },
};

export default authService;