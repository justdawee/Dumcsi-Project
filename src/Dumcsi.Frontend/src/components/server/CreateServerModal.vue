<template>
  <BaseModal
      :model-value="modelValue"
      :title="t('server.create.title')"
      @close="close"
      @update:modelValue="emit('update:modelValue', $event)"
  >
    <template #default>

      <!-- Tab Selection -->
      <div class="flex mb-6 bg-bg-base rounded-lg p-1">
        <button
            :class="['flex-1 py-2 px-4 rounded-md font-medium transition',
                   activeTab === 'create' ? 'bg-primary text-text-default' : 'text-text-muted hover:text-text-default']"
            @click="activeTab = 'create'"
        >
          {{ t('server.create.tabs.create') }}
        </button>
        <button
            :class="['flex-1 py-2 px-4 rounded-md font-medium transition',
                   activeTab === 'join' ? 'bg-primary text-text-default' : 'text-text-muted hover:text-text-default']"
            @click="activeTab = 'join'"
        >
          {{ t('server.create.tabs.join') }}
        </button>
      </div>

      <!-- Create Server Tab -->
      <form v-if="activeTab === 'create'" class="space-y-4" @submit.prevent="handleCreateServer">
        <div>
          <label class="form-label">{{ t('server.create.name') }}</label>
          <input
              v-model="createForm.name"
              class="form-input"
              :placeholder="t('server.create.namePlaceholder')"
              required
              type="text"
          />
        </div>

        <div>
          <label class="form-label">{{ t('server.create.description') }}</label>
          <textarea
              v-model="createForm.description"
              class="form-input resize-none"
              :placeholder="t('server.create.descriptionPlaceholder')"
              rows="3"
          />
        </div>

        <div class="flex items-center">
          <input
              id="public"
              v-model="createForm.public"
              class="w-4 h-4 text-primary bg-main-700 border-border-default rounded-sm focus:ring-primary/50"
              type="checkbox"
          />
          <label class="ml-2 text-sm text-text-secondary" for="public">
            {{ t('server.create.publicToggle') }}
          </label>
        </div>

        <div class="flex gap-3 pt-4">
          <button
              class="flex-1 btn-secondary"
              type="button"
              @click="close"
          >
            {{ t('common.cancel') }}
          </button>
          <button
              :disabled="loading"
              class="flex-1 btn-primary inline-flex justify-center items-center"
              type="submit"
          >
            <Loader2 v-if="loading && activeTab === 'create'" class="w-5 h-5 animate-spin mr-2"/>
            {{ t('server.create.actions.create') }}
          </button>
        </div>
      </form>

      <!-- Join Server Tab -->
      <form v-else class="space-y-4" @submit.prevent="handleJoinServer">
        <div>
          <label class="form-label">{{ t('server.create.inviteCode') }}</label>
          <input
              v-model="joinForm.inviteCode"
              class="form-input uppercase font-mono"
              maxlength="8"
              :placeholder="t('server.create.invitePlaceholder')"
              required
              type="text"
          />
        </div>

        <div class="flex gap-3 pt-4">
          <button
              class="flex-1 btn-secondary"
              type="button"
              @click="close"
          >
            {{ t('common.cancel') }}
          </button>
          <button
              :disabled="loading"
              class="flex-1 btn-primary inline-flex justify-center items-center"
              type="submit"
          >
            <Loader2 v-if="loading && activeTab === 'join'" class="w-5 h-5 animate-spin mr-2"/>
            {{ t('server.create.actions.join') }}
          </button>
        </div>
      </form>

      <!-- Error Message -->
      <div v-if="error" class="mt-4 p-3 bg-danger/10 border border-danger/50 rounded-lg">
        <p class="text-sm text-danger">{{ error }}</p>
      </div>
    </template>
  </BaseModal>
</template>

    <script lang="ts" setup>
      import {ref} from 'vue';
      import {useRouter} from 'vue-router';
      import {useAppStore} from '@/stores/app';
      import {useToast} from '@/composables/useToast';
      import {Loader2} from 'lucide-vue-next';
      import type {CreateServerRequest} from '@/services/types';
      import BaseModal from "@/components/modals/BaseModal.vue";
      import { useI18n } from 'vue-i18n';

      defineProps<{ modelValue: boolean }>();
      const emit = defineEmits(['update:modelValue', 'close']);
      const router = useRouter();
      const appStore = useAppStore();
      const {addToast} = useToast();

      const close = () => {
        emit('update:modelValue', false);
        emit('close');
      };

      const activeTab = ref<'create' | 'join'>('create');
      const loading = ref(false);
      const error = ref('');

      const createForm = ref<CreateServerRequest>({
        name: '',
        description: '',
        public: false
      });
      const { t } = useI18n();

      const handleCreateServer = async () => {
        loading.value = true;
        error.value = '';

        try {
          const response = await appStore.createServer(createForm.value);
          if (response?.serverId) {
            close();
            router.push({name: 'Server', params: {serverId: response.serverId}});
            addToast({
              type: 'success',
              message: t('server.create.toast.created', { name: createForm.value.name })
            });
          }
        } catch (err: any) {
          addToast({
            type: 'danger',
            message: t('server.create.toast.createFailed')
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
          error.value = t('server.create.errors.invalidInvite');
          return;
        }

        loading.value = true;
        error.value = '';

        try {
          const result = await appStore.joinServerWithInvite(joinForm.value.inviteCode);
          if (result?.serverId) {
            close();
            await router.push({name: 'Server', params: {serverId: result.serverId}});
            addToast({
              type: 'success',
              message: t('server.create.toast.joined')
            });
          }
        } catch (err: any) {
          addToast({
            type: 'danger',
            title: t('server.create.inviteTitle'),
            message: t('server.create.toast.invalidInvite')
          });
        } finally {
          loading.value = false;
        }
      };
    </script>
