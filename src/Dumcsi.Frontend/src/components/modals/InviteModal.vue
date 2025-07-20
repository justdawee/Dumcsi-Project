<template>
  <Transition name="modal-fade">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
        @click.self="closeModal"
    >
      <div
          class="w-full max-w-md transform rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
        <!-- Fejléc -->
        <header class="flex items-center space-x-4 mb-4">
          <UserAvatar
              v-if="server"
              :avatar-url="server.icon"
              :size="64"
              :username="server.name"
          />
          <div class="min-w-0">
            <p class="text-xs text-gray-400">You are inviting people to</p>
            <h3 :title="server?.name" class="text-xl font-bold text-white truncate">{{ server?.name }}</h3>
          </div>
        </header>

        <p v-if="server?.description" class="text-sm text-gray-400 mb-6 border-l-2 border-primary/50 pl-3">
          {{ server.description }}
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2" for="invite-code">
            Share this invite code with others
          </label>

          <div v-if="!inviteCode" class="relative flex items-center">
            <div class="h-[46px] w-full animate-pulse rounded-lg bg-gray-700/80"></div>
          </div>

          <div v-else class="relative flex items-center">
            <input
                id="invite-code"
                :value="inviteCode"
                class="form-input pr-12 cursor-pointer font-mono tracking-wider"
                readonly
                type="text"
                @click="copyToClipboard"
            />
            <button
                aria-label="Copy invite code"
                class="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                @click="copyToClipboard"
            >
              <Copy class="w-5 h-5"/>
            </button>
          </div>

          <div class="h-5 mt-2">
            <p :class="['text-xs text-green-400 transition-opacity duration-300', copied ? 'opacity-100' : 'opacity-0']">
              ✓ Copied to clipboard!
            </p>
          </div>
        </div>

        <div class="mt-4 text-right">
          <button class="btn-secondary" @click="closeModal">
            Close
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {ref} from 'vue';
import {Copy} from 'lucide-vue-next';
import type {ServerListItem} from '@/services/types';
import UserAvatar from '@/components/common/UserAvatar.vue';

const props = defineProps<{
  modelValue: boolean;
  server: ServerListItem | null;
  inviteCode?: string;
}>();

const emit = defineEmits(['update:modelValue']);

const copied = ref(false);

const closeModal = () => {
  emit('update:modelValue', false);
};

const copyToClipboard = async () => {
  if (!props.inviteCode) return;
  try {
    await navigator.clipboard.writeText(props.inviteCode);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2500);
  } catch (error) {
    console.error('Failed to copy invite code:', error);
  }
};
</script>