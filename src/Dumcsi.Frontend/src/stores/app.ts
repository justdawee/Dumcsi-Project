import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import type {
  ServerListItem,
  ServerDetail,
  ChannelDetail,
  MessageListItem,
  ServerMember,
  CreateServerPayload,
  CreateChannelPayload,
  CreateMessagePayload,
  ChannelListItem,
} from '@/services/types';

import serverService from '@/services/serverService';
import channelService from '@/services/channelService';
import messageService from '@/services/messageService';

export const useAppStore = defineStore('app', () => {
  // --- State ---
  // A state most már a központi, részletes típusokat használja.
  const servers = ref<ServerListItem[]>([]);
  const currentServer = ref<ServerDetail | null>(null);
  const currentChannel = ref<ChannelDetail | null>(null);
  const messages = ref<MessageListItem[]>([]);
  const members = ref<ServerMember[]>([]);

  const loading = ref({
    servers: false,
    server: false,
    channel: false,
    messages: false,
    members: false,
  });
  const error = ref<string | null>(null);

  // --- Getters ---
  const currentServerChannels = computed(() =>
    currentServer.value?.channels || []
  );

  // --- Actions ---

  const fetchServers = async () => {
    loading.value.servers = true;
    error.value = null;
    try {
      const response = await serverService.getServers();
      servers.value = response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch servers';
    } finally {
      loading.value.servers = false;
    }
  };

  const fetchServer = async (serverId: string | number): Promise<ServerDetail | undefined> => {
    loading.value.server = true;
    error.value = null;
    try {
      const response = await serverService.getServer(serverId);
      currentServer.value = response.data;
      // Szerver betöltésekor a tagokat is lekérjük
      await fetchServerMembers(serverId);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch server details';
      currentServer.value = null; // Hiba esetén ürítsük ki
    } finally {
      loading.value.server = false;
    }
  };

  const fetchChannel = async (channelId: string | number): Promise<ChannelDetail | undefined> => {
    loading.value.channel = true;
    error.value = null;
    try {
      // A channelService-t használjuk, nem a serverService-t
      const response = await channelService.getChannel(channelId);
      currentChannel.value = response.data;
      // A ChannelDetail DTO már tartalmazza az első 50 üzenetet,
      // így azokat közvetlenül beállíthatjuk.
      messages.value = response.data.messages.reverse(); // A legfrissebb legyen alul
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch channel';
      currentChannel.value = null;
    } finally {
      loading.value.channel = false;
    }
  };

  const fetchMessages = async (channelId: string | number, before?: number) => {
    loading.value.messages = true;
    error.value = null;
    try {
      const response = await messageService.getMessages(channelId, { before, limit: 50 });
      // Új üzenetek hozzáadása a meglévőkhöz (lapozás)
      messages.value = [...response.data.reverse(), ...messages.value];
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch messages';
    } finally {
      loading.value.messages = false;
    }
  };

  const fetchServerMembers = async (serverId: string | number) => {
      loading.value.members = true;
      error.value = null;
      try {
          const response = await serverService.getServerMembers(serverId);
          members.value = response.data;
      } catch (err: any) {
          error.value = err.response?.data?.message || 'Failed to fetch members';
      } finally {
          loading.value.members = false;
      }
  }

  const sendMessage = async (channelId: string | number, payload: CreateMessagePayload): Promise<MessageListItem | undefined> => {
    try {
      const response = await messageService.sendMessage(channelId, payload);
      messages.value.push(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to send message';
      throw err;
    }
  };

  const createServer = async (serverData: CreateServerPayload): Promise<{ serverId: number; message: string } | undefined> => {
    try {
      const response = await serverService.createServer(serverData);
      await fetchServers(); // Szerverlista frissítése
      return response.data; // Visszaadjuk a szerver ID-t és az üzenetet
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create server';
      throw err;
    }
  };

  const createChannel = async (serverId: string | number, channelData: CreateChannelPayload): Promise<ChannelListItem | undefined> => {
    try {
      const response = await serverService.createChannel(serverId, channelData);
      if (currentServer.value && currentServer.value.id === serverId) {
        currentServer.value.channels.push(response.data); // UI azonnali frissítése
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create channel';
      throw err;
    }
  };

  const joinServer = async (inviteCode: string): Promise<{ serverId: number } | undefined> => {
    try {
      const response = await serverService.joinServer(inviteCode);
      await fetchServers(); 
      return { serverId: response.data.serverId };
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to join server';
      throw err;
    }
  };

  const leaveServer = async (serverId: string | number): Promise<void> => {
    try {
      await serverService.leaveServer(serverId);
      if (currentServer.value?.id === serverId) {
          currentServer.value = null;
          currentChannel.value = null;
          messages.value = [];
          members.value = [];
      }
      await fetchServers(); // Szerverlista frissítése
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to leave server';
      throw err;
    }
  };

  const reset = () => {
    servers.value = [];
    currentServer.value = null;
    currentChannel.value = null;
    messages.value = [];
    members.value = [];
    error.value = null;
  };

  return {
    // State
    servers,
    currentServer,
    currentChannel,
    messages,
    members,
    loading,
    error,
    // Getters
    currentServerChannels,
    // Actions
    fetchServers,
    fetchServer,
    fetchChannel,
    fetchMessages,
    fetchServerMembers,
    sendMessage,
    createServer,
    createChannel,
    joinServer,
    leaveServer,
    reset,
  };
});
