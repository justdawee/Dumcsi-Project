import type { HubConnection } from '@microsoft/signalr';
import { useAppStore } from '@/stores/app';
import { useToast } from '@/composables/useToast';
import type {
  MessageDto,
  UserDto,
  ServerDto,
  ChannelDto,
  MessageDeletedPayload,
  UserServerPayload,
  ChannelDeletedPayload,
  EntityId
} from '@/services/types';

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
  connection.on('UserUpdated', (user: UserDto) => {
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
  connection.on('ServerCreated', (server: ServerDto) => {
    store.handleServerCreated(server);
  });

  connection.on('ServerUpdated', (server: ServerDto) => {
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
    if (payload.userId === store.currentUserId) {
      addToast({
        type: 'warning',
        title: 'Kicked from Server',
        message: `You have been kicked from ${payload.serverName || 'the server'}`,
        duration: 5000
      });
    }
  });

  connection.on('UserBannedFromServer', (payload: UserServerPayload) => {
    store.handleUserBannedFromServer(payload);
    if (payload.userId === store.currentUserId) {
      addToast({
        type: 'danger',
        title: 'Banned from Server',
        message: `You have been banned from ${payload.serverName || 'the server'}`,
        duration: 5000
      });
    }
  });

  // Csatorna események
  connection.on('ChannelCreated', (serverId: EntityId, channel: ChannelDto) => {
    store.handleChannelCreated(serverId, channel);
  });

  connection.on('ChannelUpdated', (channel: ChannelDto) => {
    store.handleChannelUpdated(channel);
  });

  connection.on('ChannelDeleted', (payload: ChannelDeletedPayload) => {
    store.handleChannelDeleted(payload);
  });

  // Hangcsatorna események
  connection.on('UserJoinedVoiceChannel', (channelId: EntityId, user: UserDto) => {
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
