import type { AxiosResponse } from 'axios';
import api from './api';
import type { LoginPayload, RegisterPayload } from './types';

const authService = {
  /**
   * POST /api/auth/register
   */
  register(payload: RegisterPayload): Promise<AxiosResponse<void>> { // TODO: headers and error handling
    return api.post('/auth/register', payload);
  },

  /**
   * POST /api/auth/login
   */
  login(payload: LoginPayload): Promise<AxiosResponse<string>> {
    return api.post<string>('/auth/login', payload); // TODO: response type should be a token, but currently it's a string
  },
};
export default authService;