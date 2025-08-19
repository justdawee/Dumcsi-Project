<template>
  <Transition name="modal-fade">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
        v-backdrop-close="closeModal"
    >
      <div
          class="w-full max-w-md transform rounded-2xl bg-bg-surface p-6 text-left align-middle shadow-xl transition-all border border-border-default/50">
        <!-- Fejléc -->
        <header class="flex items-center space-x-4 mb-4">
          <UserAvatar
              v-if="server"
              :avatar-url="server.icon"
              :size="64"
              :username="server.name"
          />
          <div class="min-w-0">
            <p class="text-xs text-text-muted">You are inviting people to</p>
            <h3 :title="server?.name" class="text-xl font-bold text-text-default truncate">{{ server?.name }}</h3>
          </div>
        </header>

        <p v-if="server?.description" class="text-sm text-text-muted mb-6 border-l-2 border-primary/50 pl-3">
          {{ server.description }}
        </p>

        <!-- Invite Settings -->
        <div class="mb-4 space-y-4">
          <!-- Expiration -->
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Expires after</label>
            <select v-model="inviteSettings.expiresInHours" @change="onSettingsChange" class="form-input">
              <option :value="null">Never</option>
              <option :value="1">1 hour</option>
              <option :value="6">6 hours</option>
              <option :value="12">12 hours</option>
              <option :value="24">1 day</option>
              <option :value="168">7 days</option>
            </select>
          </div>

          <!-- Max uses -->
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Max number of uses</label>
            <select v-model="inviteSettings.maxUses" @change="onSettingsChange" class="form-input">
              <option :value="0">Unlimited</option>
              <option :value="1">1 use</option>
              <option :value="5">5 uses</option>
              <option :value="10">10 uses</option>
              <option :value="25">25 uses</option>
              <option :value="50">50 uses</option>
              <option :value="100">100 uses</option>
            </select>
          </div>

          <!-- Temporary membership -->
          <label class="flex items-center space-x-3 cursor-pointer">
            <input 
              v-model="inviteSettings.isTemporary" 
              @change="onSettingsChange"
              type="checkbox" 
              class="form-checkbox text-primary focus:ring-primary"
            />
            <div>
              <div class="text-sm font-medium text-text-default">Temporary membership</div>
              <div class="text-xs text-text-muted">Users will be kicked when they go offline</div>
            </div>
          </label>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-text-secondary mb-2" for="invite-code">
            Share this invite code with others
          </label>

          <div v-if="generating || !inviteCode" class="relative flex items-center">
            <div class="h-[46px] w-full animate-pulse rounded-lg bg-main-700/80"></div>
          </div>

          <div v-else class="relative flex items-center">
            <input
                id="invite-code"
                :value="inviteCode"
                :class="[
                  'form-input pr-12 cursor-pointer font-mono tracking-wider transition-shadow duration-300',
                  copied ? 'ring-2 ring-green-500/70 shadow-[0_0_16px_rgba(34,197,94,0.35)]' : ''
                ]"
                readonly
                type="text"
                @click="copyToClipboard"
            />
            <button
                aria-label="Copy invite code"
                class="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-main-600 text-text-muted hover:text-text-default transition-colors"
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

        <div class="flex justify-between">
          <button class="btn-secondary" @click="closeModal">
            Cancel
          </button>
          <button class="btn-primary" @click="generateNewInvite" :disabled="generating">
            {{ generating ? 'Generating...' : 'Generate New Link' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {ref, watch, reactive} from 'vue';
import {Copy} from 'lucide-vue-next';
import type {ServerListItem, CreateInviteRequest} from '@/services/types';
import UserAvatar from '@/components/common/UserAvatar.vue';
import serverService from '@/services/serverService';
import {useToast} from '@/composables/useToast';

const props = defineProps<{
  modelValue: boolean;
  server: ServerListItem | null;
  inviteCode?: string;
}>();

const emit = defineEmits(['update:modelValue', 'inviteGenerated']);

const { addToast } = useToast();
const copied = ref(false);
const autoCopied = ref(false);
const generating = ref(false);

const inviteSettings = reactive<CreateInviteRequest>({
  expiresInHours: 1, // Default 1 hour
  maxUses: 0, // Unlimited
  isTemporary: false
});

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

const generateNewInvite = async () => {
  if (!props.server || generating.value) return;
  
  generating.value = true;
  try {
    const response = await serverService.generateInvite(props.server.id, inviteSettings);
    emit('inviteGenerated', response.code);
    addToast({ type: 'success', message: 'New invite link generated!' });
  } catch (error: any) {
    console.error('Failed to generate invite:', error);
    addToast({ 
      type: 'danger', 
      message: error.message || 'Failed to generate invite link'
    });
  } finally {
    generating.value = false;
  }
};

const onSettingsChange = () => {
  // Settings changed, user needs to generate new invite
  // We don't auto-generate here to give user control
};

// Auto-copy when modal opens with a valid invite code
watch(
  () => [props.modelValue, props.inviteCode] as const,
  async ([open, code]) => {
    if (open && code && !autoCopied.value) {
      await copyToClipboard();
      autoCopied.value = true;
    }
    if (!open) {
      autoCopied.value = false;
      copied.value = false;
    }
  },
  { immediate: true }
);

// Generate initial invite when modal opens
watch(
  () => props.modelValue,
  async (open) => {
    if (open && props.server && !props.inviteCode) {
      await generateNewInvite();
    }
  },
  { immediate: true }
);
</script>
