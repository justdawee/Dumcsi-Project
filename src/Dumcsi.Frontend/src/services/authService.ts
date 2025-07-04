import type { AxiosResponse } from 'axios';
import api from './api';
import type { LoginPayload, RegisterPayload } from './types';

export type AuthToken = string;

const authService = {

  /**
   * Registers a new user.
   * @param payload - The registration details.
   * @returns A promise that resolves to the Axios response.
   */

  register(payload: RegisterPayload): Promise<AxiosResponse<void>> {
    return api.post('/auth/register', payload);
  },

  /**
   * Logs in a user.
   * @param payload - The login credentials.
   * @returns A promise that resolves to the Axios response containing the authentication token.
   */
  
  login(payload: LoginPayload): Promise<AxiosResponse<AuthToken>> {
    return api.post<AuthToken>('/auth/login', payload);
  },
};

export default authService;