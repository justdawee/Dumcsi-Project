import type { AxiosResponse } from 'axios';
import api from './api';
import type { JoinServerResponse } from './types';

/**
 * Service for handling server invite operations.
 */
const inviteService = {
  joinServerWithInvite(inviteCode: string): Promise<AxiosResponse<JoinServerResponse>> {
    // This POST request does not need a body, the code is in the URL.
    return api.post<JoinServerResponse>(`/invites/${inviteCode}`);
  },
};

export default inviteService;
