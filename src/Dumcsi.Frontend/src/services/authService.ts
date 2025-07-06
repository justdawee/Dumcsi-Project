import api from './api';
import type { LoginPayload, RegisterPayload, AuthResponse } from './types';

const authService = {
  register(payload: RegisterPayload): Promise<void> {
    return api.post('/auth/register', payload).then(res => res.data);
  },

  login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', payload).then(res => res.data);
  },
};

export default authService;