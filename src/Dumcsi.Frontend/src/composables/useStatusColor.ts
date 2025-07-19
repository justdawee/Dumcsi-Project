import { UserStatus } from '@/services/types';

export function useStatusColor() {
    const colorMap: Record<UserStatus, string> = {
        [UserStatus.Online]: '#23a55a',
        [UserStatus.Idle]: '#f0b232',
        [UserStatus.Busy]: '#f23f43',
        [UserStatus.Offline]: '#80848e',
    };

    const getStatusColor = (status: UserStatus | undefined): string => {
        return status ? colorMap[status] || colorMap[UserStatus.Offline] : colorMap[UserStatus.Offline];
    };

    return { getStatusColor };
}