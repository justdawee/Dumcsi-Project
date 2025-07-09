import type { HubConnection } from '@microsoft/signalr'
import { useToast } from '@/composables/useToast'
import type {
  MessageDto,
  UserDto,
  ServerDetailDto,
  ChannelDetailDto,
  MessageDeletedPayload,
  UserServerPayload,
  ChannelDeletedPayload,
  EntityId,
  RoleDto,
  EmojiDto
} from '@/types'

type AppStore = ReturnType<typeof import('@/stores/app').useAppStore>

export function registerSignalREventHandlers(connection: HubConnection, store: AppStore) {
  const { addToast } = useToast()

  // Message events
  connection.on('ReceiveMessage', (message: MessageDto) => {
    store.handleReceiveMessage(message)
  })

  connection.on('MessageUpdated', (message: MessageDto) => {
    store.handleMessageUpdated(message)
  })

  connection.on('MessageDeleted', (payload: MessageDeletedPayload) => {
    store.handleMessageDeleted(payload)
  })

  // User events
  connection.on('UserUpdated', (user: UserDto) => {
    store.handleUserUpdated(user)
  })

  connection.on('UserOnline', (userId: EntityId) => {
    store.handleUserOnline(userId)
  })

  connection.on('UserOffline', (userId: EntityId) => {
    store.handleUserOffline(userId)
  })

  connection.on('UserTyping', (channelId: EntityId, userId: EntityId) => {
    store.handleUserTyping(channelId, userId)
  })

  connection.on('UserStoppedTyping', (channelId: EntityId, userId: EntityId) => {
    store.handleUserStoppedTyping(channelId, userId)
  })

  // Server events
  connection.on('ServerCreated', (server: ServerDetailDto) => {
    store.handleServerCreated(server)
  })

  connection.on('ServerUpdated', (server: ServerDetailDto) => {
    store.handleServerUpdated(server)
  })

  connection.on('ServerDeleted', (serverId: EntityId) => {
    store.handleServerDeleted(serverId)
    addToast({
      type: 'info',
      message: 'A server has been deleted',
      duration: 3000
    })
  })

  connection.on('UserJoinedServer', (payload: UserServerPayload) => {
    store.handleUserJoinedServer(payload)
  })

  connection.on('UserLeftServer', (payload: UserServerPayload) => {
    store.handleUserLeftServer(payload)
  })

  connection.on('UserKickedFromServer', (payload: UserServerPayload) => {
    store.handleUserKickedFromServer(payload)
    if (payload.userId === store.currentUserId) {
      addToast({
        type: 'warning',
        title: 'Kicked from Server',
        message: `You have been kicked from ${payload.serverName || 'the server'}`,
        duration: 5000
      })
    }
  })

  connection.on('UserBannedFromServer', (payload: UserServerPayload) => {
    store.handleUserBannedFromServer(payload)
    if (payload.userId === store.currentUserId) {
      addToast({
        type: 'danger',
        title: 'Banned from Server',
        message: `You have been banned from ${payload.serverName || 'the server'}`,
        duration: 5000
      })
    }
  })

  // Channel events
  connection.on('ChannelCreated', (channel: ChannelDetailDto) => {
    store.handleChannelCreated(channel)
  })

  connection.on('ChannelUpdated', (channel: ChannelDetailDto) => {
    store.handleChannelUpdated(channel)
  })

  connection.on('ChannelDeleted', (payload: ChannelDeletedPayload) => {
    store.handleChannelDeleted(payload)
  })

  // Role events
  connection.on('RoleCreated', (role: RoleDto) => {
    store.handleRoleCreated(role)
  })

  connection.on('RoleUpdated', (role: RoleDto) => {
    store.handleRoleUpdated(role)
  })

  connection.on('RoleDeleted', (roleId: EntityId) => {
    store.handleRoleDeleted(roleId)
  })

  connection.on('MemberRolesUpdated', (payload: { serverId: EntityId; userId: EntityId; roles: RoleDto[] }) => {
    store.handleMemberRolesUpdated(payload)
  })

  // Emoji events
  connection.on('EmojiCreated', (emoji: EmojiDto) => {
    store.handleEmojiCreated(emoji)
  })

  connection.on('EmojiDeleted', (payload: { serverId: EntityId; emojiId: EntityId }) => {
    store.handleEmojiDeleted(payload)
  })

  // Reaction events
  connection.on('ReactionAdded', (payload: { channelId: EntityId; messageId: EntityId; emojiId: string; userId: EntityId }) => {
    store.handleReactionAdded(payload)
  })

  connection.on('ReactionRemoved', (payload: { channelId: EntityId; messageId: EntityId; emojiId: string; userId: EntityId }) => {
    store.handleReactionRemoved(payload)
  })

  // Voice channel events
  connection.on('UserJoinedVoice', (payload: { channelId: EntityId; userId: EntityId }) => {
    store.handleUserJoinedVoice(payload)
  })

  connection.on('UserLeftVoice', (payload: { channelId: EntityId; userId: EntityId }) => {
    store.handleUserLeftVoice(payload)
  })

  connection.on('AllUsersInChannel', (payload: { channelId: EntityId; userIds: EntityId[] }) => {
    store.handleAllUsersInChannel(payload)
  })

  // WebRTC events for voice/video
  connection.on('ReceiveOffer', (payload: { fromUserId: EntityId; offer: RTCSessionDescriptionInit }) => {
    // Handle WebRTC offer - to be implemented with WebRTC functionality
    console.log('Received WebRTC offer from:', payload.fromUserId)
  })

  connection.on('ReceiveAnswer', (payload: { fromUserId: EntityId; answer: RTCSessionDescriptionInit }) => {
    // Handle WebRTC answer - to be implemented with WebRTC functionality
    console.log('Received WebRTC answer from:', payload.fromUserId)
  })

  connection.on('ReceiveIceCandidate', (payload: { fromUserId: EntityId; candidate: RTCIceCandidateInit }) => {
    // Handle ICE candidate - to be implemented with WebRTC functionality
    console.log('Received ICE candidate from:', payload.fromUserId)
  })

  connection.on('UserStartedScreenShare', (payload: { userId: EntityId; channelId: EntityId }) => {
    store.handleUserStartedScreenShare(payload)
    addToast({
      type: 'info',
      message: 'User started screen sharing',
      duration: 3000
    })
  })

  connection.on('UserStoppedScreenShare', (payload: { userId: EntityId; channelId: EntityId }) => {
    store.handleUserStoppedScreenShare(payload)
  })
}