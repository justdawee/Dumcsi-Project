import type { HubConnection } from '@microsoft/signalr';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import type {
  MessageDto,
  UserProfileDto,
  ServerListItemDto,
  ChannelListItemDto,
  MessageDeletedPayload,
  UserServerPayload,
  ChannelDeletedPayload,
  EntityId
} from './types';

// A store típusának definiálása a jobb típusbiztonság érdekében
type AppStore = ReturnType<typeof useAppStore>;

/**
 * Regisztrálja az összes alkalmazás-specifikus SignalR eseménykezelőt.
 * @param connection Az aktív SignalR kapcsolat.
 * @param store Az app store példánya.
 */
export function registerSignalREventHandlers(connection: HubConnection, store: AppStore) {
  const { addToast } = useToast();

  // Üzenet események
  connection.on('ReceiveMessage', (message: MessageDto) => {
    store.handleReceiveMessage(message);
  });

  connection.on('MessageUpdated', (message: MessageDto) => {
    store.handleMessageUpdated(message);
  });

  connection.on('MessageDeleted', (payload: MessageDeletedPayload) => {
    store.handleMessageDeleted(payload);
  });

  // Felhasználó események
  connection.on('UserUpdated', (user: UserProfileDto) => {
    store.handleUserUpdated(user);
  });

  connection.on('UserOnline', (userId: EntityId) => {
    store.handleUserOnline(userId);
  });

  connection.on('UserOffline', (userId: EntityId) => {
    store.handleUserOffline(userId);
  });

  connection.on('UserTyping', (channelId: EntityId, userId: EntityId) => {
    store.handleUserTyping(channelId, userId);
  });

  connection.on('UserStoppedTyping', (channelId: EntityId, userId: EntityId) => {
    store.handleUserStoppedTyping(channelId, userId);
  });

  // Szerver események
  /* NOT USED
  connection.on('ServerCreated', (server: ServerDto) => {
    store.handleServerCreated(server);
  });
  */

  connection.on('ServerUpdated', (server: ServerListItemDto) => {
    store.handleServerUpdated(server);
  });

  connection.on('ServerDeleted', (serverId: EntityId) => {
    store.handleServerDeleted(serverId);
  });

  connection.on('UserJoinedServer', (payload: UserServerPayload) => {
    store.handleUserJoinedServer(payload);
  });

  connection.on('UserLeftServer', (payload: UserServerPayload) => {
    store.handleUserLeftServer(payload);
  });

  connection.on('UserKickedFromServer', (payload: UserServerPayload) => {
    store.handleUserKickedFromServer(payload);
    if (payload.user.id === store.currentUserId) {
      addToast({
        type: 'warning',
        title: 'Kicked from Server',
        message: `You have been kicked from a server`,
        duration: 5000
      });
    }
  });

  connection.on('UserBannedFromServer', (payload: UserServerPayload) => {
    store.handleUserBannedFromServer(payload);
    if (payload.user.id === store.currentUserId) {
      addToast({
        type: 'danger',
        title: 'Banned from Server',
        message: `You have been banned from a server`,
        duration: 5000
      });
    }
  });

  // Csatorna események
  connection.on('ChannelCreated', (serverId: EntityId, channel: ChannelListItemDto) => {
    store.handleChannelCreated(serverId, channel);
  });

  connection.on('ChannelUpdated', (channel: ChannelListItemDto) => {
    store.handleChannelUpdated(channel);
  });

  connection.on('ChannelDeleted', (payload: ChannelDeletedPayload) => {
    store.handleChannelDeleted(payload);
  });

  // Hangcsatorna események
  connection.on('UserJoinedVoiceChannel', (channelId: EntityId, user: UserProfileDto) => {
    store.handleUserJoinedVoiceChannel(channelId, user);
  });

  connection.on('UserLeftVoiceChannel', (channelId: EntityId, userId: EntityId) => {
    store.handleUserLeftVoiceChannel(channelId, userId);
  });

  connection.on('UserStartedScreenShare', (channelId: EntityId, userId: EntityId) => {
    store.handleUserStartedScreenShare(channelId, userId);
  });

  connection.on('UserStoppedScreenShare', (channelId: EntityId, userId: EntityId) => {
    store.handleUserStoppedScreenShare(channelId, userId);
  });
}
