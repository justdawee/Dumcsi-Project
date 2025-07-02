<template>
  <div class="flex-1 flex flex-col bg-gray-800 h-full overflow-hidden">
    <div class="px-6 py-3 border-b border-gray-700 flex items-center justify-between shadow-xs flex-shrink-0">
      <div class="flex items-center gap-2">
        <Hash class="w-5 h-5 text-gray-400" />
        <h3 class="font-semibold text-white">{{ currentChannel?.name }}</h3>
        <span v-if="currentChannel?.description" class="text-sm text-gray-400 ml-2">
          {{ currentChannel.description }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button @click="toggleMemberList" class="p-2 hover:bg-gray-700 rounded-sm transition">
          <Users class="w-5 h-5 text-gray-400" />
        </button>
        <div class="relative">
          <input
            type="text"
            placeholder="Search..."
            class="bg-gray-900 rounded-md px-3 py-1.5 text-sm w-48 focus:w-64 transition-all"
          />
          <Search class="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" />
        </div>
      </div>
    </div>

    <div class="flex-1 flex overflow-hidden">
      <div
        ref="messagesContainer"
        class="flex-1 overflow-y-auto scrollbar-thin p-4"
        @scroll="handleScroll"
      >
        <div v-if="appStore.loading.messages" class="flex justify-center py-4">
          <Loader2 class="w-6 h-6 text-gray-500 animate-spin" />
        </div>

        <div v-if="showLoadMoreButton && !appStore.loading.messages" class="text-center">
          <button
            @click="loadMoreMessages"
            class="text-sm text-primary hover:text-primary-hover transition"
          >
            Load more messages
          </button>
        </div>

        <MessageItem
          v-for="(message, index) in messages"
          :key="message.id"
          :message="message"
          :previous-message="messages[index - 1]"
          :current-user-id="authStore.user?.id"
          @edit="handleEditMessage"
          @delete="handleDeleteMessage"
        />

        <div v-if="!appStore.loading.messages && messages.length === 0" class="text-center py-8">
          <p class="text-gray-400">No messages yet. Start the conversation!</p>
        </div>
      </div>

      <div v-if="isMemberListOpen" class="w-60 bg-gray-800 border-l border-gray-700 p-4 animate-slide-in flex flex-col">
        <h3 class="font-semibold text-white mb-4">Members - {{ members.length }}</h3>
        
        <ul class="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
          <li v-for="member in members" :key="member.id" class="flex items-center gap-3">
            <img :src="member.avatar" alt="Avatar" class="w-8 h-8 rounded-full bg-gray-700">
            <span class="text-gray-300 font-medium text-sm">{{ member.name }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="px-4 pb-4">
      <MessageInput
        :channel-name="currentChannel?.name"
        @send="handleSendMessage"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { Hash, Search, Users, Loader2 } from 'lucide-vue-next'
import MessageItem from '@/components/message/MessageItem.vue'
import MessageInput from '@/components/message/MessageInput.vue'
import messageService from '@/services/messageService'

const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

const messagesContainer = ref(null)
const hasMoreMessages = ref(true)
const showLoadMoreButton = ref(false);
const isMemberListOpen = ref(false);

const currentChannel = computed(() => appStore.currentChannel)
const messages = computed(() => appStore.messages)

const members = ref([
  { id: 1, name: 'Kovács Béla', avatar: 'https://i.pravatar.cc/40?u=1' },
  { id: 2, name: 'Nagy Anna', avatar: 'https://i.pravatar.cc/40?u=2' },
  { id: 3, name: 'Szabó Gergő', avatar: 'https://i.pravatar.cc/40?u=3' },
  { id: 4, name: 'Tóth Zsófia', avatar: 'https://i.pravatar.cc/40?u=4' },
  { id: 5, name: 'Kiss István', avatar: 'https://i.pravatar.cc/40?u=5' },
  { id: 6, name: 'Horváth Gábor', avatar: 'https://i.pravatar.cc/40?u=6' },
  { id: 7, name: 'Varga Judit', avatar: 'https://i.pravatar.cc/40?u=7' },
  { id: 8, name: 'Molnár Péter', avatar: 'https://i.pravatar.cc/40?u=8' },
  { id: 9, name: 'Németh Zsuzsanna', avatar: 'https://i.pravatar.cc/40?u=9' },
  { id: 10, name: 'Farkas László', avatar: 'https://i.pravatar.cc/40?u=10' },
  { id: 11, name: 'Papp Mária', avatar: 'https://i.pravatar.cc/40?u=11' },
  { id: 12, name: 'Balogh Tamás', avatar: 'https://i.pravatar.cc/40?u=12' },
  { id: 13, name: 'Juhász Éva', avatar: 'https://i.pravatar.cc/40?u=13' },
  { id: 14, name: 'Takács Zoltán', avatar: 'https://i.pravatar.cc/40?u=14' },
  { id: 15, name: 'Mészáros András', avatar: 'https://i.pravatar.cc/40?u=15' },
  { id: 16, name: 'Lakatos Dávid', avatar: 'https://i.pravatar.cc/40?u=16' },
  { id: 17, name: 'Simon Katalin', avatar: 'https://i.pravatar.cc/40?u=17' },
  { id: 18, name: 'Fekete Bence', avatar: 'https://i.pravatar.cc/40?u=18' },
  { id: 19, name: 'Oláh Eszter', avatar: 'https://i.pravatar.cc/40?u=19' },
  { id: 20, name: 'Vörös Attila', avatar: 'https://i.pravatar.cc/40?u=20' },
  { id: 21, name: 'Fehér Réka', avatar: 'https://i.pravatar.cc/40?u=21' },
  { id: 22, name: 'Szalai József', avatar: 'https://i.pravatar.cc/40?u=22' },
  { id: 23, name: 'Sipos Ágnes', avatar: 'https://i.pravatar.cc/40?u=23' },
  { id: 24, name: 'Magyar Dániel', avatar: 'https://i.pravatar.cc/40?u=24' },
  { id: 25, name: 'Gál Petra', avatar: 'https://i.pravatar.cc/40?u=25' },
  { id: 26, name: 'Bíró János', avatar: 'https://i.pravatar.cc/40?u=26' },
  { id: 27, name: 'Vass Erzsébet', avatar: 'https://i.pravatar.cc/40?u=27' },
  { id: 28, name: 'Fazekas Márton', avatar: 'https://i.pravatar.cc/40?u=28' },
  { id: 29, name: 'Bognár Noémi', avatar: 'https://i.pravatar.cc/40?u=29' },
  { id: 30, name: 'Jakab Kristóf', avatar: 'https://i.pravatar.cc/40?u=30' },
  { id: 31, name: 'Pintér Orsolya', avatar: 'https://i.pravatar.cc/40?u=31' },
  { id: 32, name: 'Kerekes Ádám', avatar: 'https://i.pravatar.cc/40?u=32' },
  { id: 33, name: 'Somogyi Balázs', avatar: 'https://i.pravatar.cc/40?u=33' },
  { id: 34, name: 'Antal Tímea', avatar: 'https://i.pravatar.cc/40?u=34' },
  { id: 35, name: 'Hegedűs Nikolett', avatar: 'https://i.pravatar.cc/40?u=35' },
]);

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const loadChannel = async (channelId) => {
  hasMoreMessages.value = true;
  await appStore.fetchChannel(channelId);
  await scrollToBottom();
  await checkOverflowAndSetButtonVisibility();
};

const loadMoreMessages = async () => {
  if (messages.value.length === 0) return;
  
  const oldestMessage = messages.value[0];
  const oldScrollHeight = messagesContainer.value.scrollHeight;
  
  await appStore.fetchMessages(currentChannel.value.id, oldestMessage.id);
  
  await nextTick();
  const newScrollHeight = messagesContainer.value.scrollHeight;
  messagesContainer.value.scrollTop = newScrollHeight - oldScrollHeight;
  
  if (appStore.messages.length < messages.value.length + 50) {
    hasMoreMessages.value = false;
  }
  
  await checkOverflowAndSetButtonVisibility();
};

const handleScroll = () => {
  // Auto-load more when scrolling near top
  if (messagesContainer.value.scrollTop < 100 && hasMoreMessages.value && !appStore.loading.messages) {
    loadMoreMessages()
  }
}

const handleSendMessage = async (content) => {
  try {
    await appStore.sendMessage(currentChannel.value.id, { content });
    await scrollToBottom();
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

const handleEditMessage = async ({ messageId, content }) => {
  try {
    await messageService.editMessage(currentChannel.value.id, messageId, content)
    // Update the message in the store
    const messageIndex = messages.value.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      messages.value[messageIndex].content = content
      messages.value[messageIndex].isEdited = true
    }
  } catch (error) {
    console.error('Failed to edit message:', error)
  }
}

const handleDeleteMessage = async (messageId) => {
  try {
    await messageService.deleteMessage(currentChannel.value.id, messageId)
    // Remove the message from the store
    const messageIndex = messages.value.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      messages.value.splice(messageIndex, 1)
    }
  } catch (error) {
    console.error('Failed to delete message:', error)
  }
}

const checkOverflowAndSetButtonVisibility = async () => {
  await nextTick();
  if (messagesContainer.value) {
    const isOverflowing = messagesContainer.value.scrollHeight > messagesContainer.value.clientHeight;
    showLoadMoreButton.value = hasMoreMessages.value && isOverflowing;
  }
};

const toggleMemberList = () => {
  isMemberListOpen.value = !isMemberListOpen.value;
};

onMounted(() => {
  if (route.params.channelId) {
    loadChannel(parseInt(route.params.channelId))
  }
})

watch(() => route.params.channelId, (newChannelId) => {
  if (newChannelId) {
    loadChannel(parseInt(newChannelId))
  }
})

watch(() => route.params.channelId, (newChannelId) => {
  if (newChannelId) {
    loadChannel(parseInt(newChannelId))
  }
})
</script>

<style scoped>
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.animate-slide-in {
  animation: slideIn 0.2s ease-out;
}
</style>