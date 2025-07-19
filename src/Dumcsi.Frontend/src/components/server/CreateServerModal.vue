<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md animate-fade-in border border-gray-700/50">
      <h2 class="text-2xl font-bold text-white mb-6">Create or Join Server</h2>

      <!-- Tab Selection -->
      <div class="flex mb-6 bg-gray-900 rounded-lg p-1">
        <button
            :class="['flex-1 py-2 px-4 rounded-md font-medium transition',
                   activeTab === 'create' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white']"
            @click="activeTab = 'create'"
        >
          Create Server
        </button>
        <button
            :class="['flex-1 py-2 px-4 rounded-md font-medium transition',
                   activeTab === 'join' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white']"
            @click="activeTab = 'join'"
        >
          Join Server
        </button>
      </div>

      <!-- Create Server Tab -->
      <form v-if="activeTab === 'create'" class="space-y-4" @submit.prevent="handleCreateServer">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Server Name
          </label>
          <input
              v-model="createForm.name"
              class="form-input"
              placeholder="My Awesome Server"
              required
              type="text"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
              v-model="createForm.description"
              class="form-input resize-none"
              placeholder="What's your server about?"
              rows="3"
          />
        </div>

        <div class="flex items-center">
          <input
              id="public"
              v-model="createForm.public"
              class="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded-sm focus:ring-primary/50"
              type="checkbox"
          />
          <label class="ml-2 text-sm text-gray-300" for="public">
            Make server public
          </label>
        </div>

        <div class="flex gap-3 pt-4">
          <button
              class="flex-1 btn-secondary"
              type="button"
              @click="$emit('close')"
          >
            Cancel
          </button>
          <button
              :disabled="loading"
              class="flex-1 btn-primary inline-flex justify-center items-center"
              type="submit"
          >
            <Loader2 v-if="loading && activeTab === 'create'" class="w-5 h-5 animate-spin mr-2"/>
            Create Server
          </button>
        </div>
      </form>

      <!-- Join Server Tab -->
      <form v-else class="space-y-4" @submit.prevent="handleJoinServer">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Invite Code
          </label>
          <input
              v-model="joinForm.inviteCode"
              class="form-input uppercase font-mono"
              maxlength="8"
              placeholder="ABCD1234"
              required
              type="text"
          />
        </div>

        <div class="flex gap-3 pt-4">
          <button
              class="flex-1 btn-secondary"
              type="button"
              @click="$emit('close')"
          >
            Cancel
          </button>
          <button
              :disabled="loading"
              class="flex-1 btn-primary inline-flex justify-center items-center"
              type="submit"
          >
            <Loader2 v-if="loading && activeTab === 'join'" class="w-5 h-5 animate-spin mr-2"/>
            Join Server
          </button>
        </div>
      </form>

      <!-- Error Message -->
      <div v-if="error" class="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
        <p class="text-sm text-red-400">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref} from 'vue';
import {useRouter} from 'vue-router';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import {Loader2} from 'lucide-vue-next';
import type {CreateServerRequest} from '@/services/types';

const emit = defineEmits(['close']);
const router = useRouter();
const appStore = useAppStore();
const {addToast} = useToast();

const activeTab = ref<'create' | 'join'>('create');
const loading = ref(false);
const error = ref('');

const createForm = ref<CreateServerRequest>({
  name: '',
  description: '',
  public: false
});

const handleCreateServer = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await appStore.createServer(createForm.value);
    if (response?.serverId) {
      emit('close');
      router.push({name: 'Server', params: {serverId: response.serverId}});
      addToast({
        type: 'success',
        message: `Successfully created ${createForm.value.name}.`
      });
    }
  } catch (err: any) {
    addToast({
      type: 'danger',
      message: 'Failed to create server. Please try again later.'
    });
  } finally {
    loading.value = false;
  }
};

const joinForm = ref({
  inviteCode: ''
});

const handleJoinServer = async () => {
  if (!joinForm.value.inviteCode.trim()) {
    error.value = 'Please enter a valid invite code.';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await appStore.joinServerWithInvite(joinForm.value.inviteCode);
    if (result?.serverId) {
      emit('close');
      router.push({name: 'Server', params: {serverId: result.serverId}});
      addToast({
        type: 'success',
        message: 'Successfully joined the server.'
      });
    }
  } catch (err: any) {
    addToast({
      type: 'danger',
      title: 'Invite Code',
      message: 'The invite code is invalid or has expired.'
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
@reference "@/style.css";

.form-input {
  @apply w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50;
}

.btn-primary {
  @apply px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50;
}

.animate-fade-in {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
