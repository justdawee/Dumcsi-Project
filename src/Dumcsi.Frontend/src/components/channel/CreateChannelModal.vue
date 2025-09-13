<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-bg-surface rounded-xl p-6 w-full max-w-md animate-fade-in border border-border-default/50">
      <h2 class="text-xl font-bold text-text-default mb-4">{{ t('channels.modal.createTitle') }}</h2>

      <form class="space-y-4" @submit.prevent="handleCreateChannel">
        <div>
          <label class="form-label">{{ t('channels.modal.type') }}</label>
          <div class="flex gap-3">
            <label class="flex-1">
              <input
                  v-model="form.type"
                  :value="0"
                  class="sr-only"
                  type="radio"
              />
              <div :class="{ active: form.type === 0 }" class="channel-type-option">
                <Hash class="w-5 h-5"/>
                <span>{{ t('channels.modal.typeText') }}</span>
              </div>
            </label>
            <label class="flex-1">
              <input
                  v-model="form.type"
                  :value="1"
                  class="sr-only"
                  type="radio"
              />
              <div :class="{ active: form.type === 1 }" class="channel-type-option">
                <Volume2 class="w-5 h-5"/>
                <span>{{ t('channels.modal.typeVoice') }}</span>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label class="form-label">{{ t('channels.modal.name') }}</label>
          <input
              v-model="form.name"
              class="form-input"
              pattern="[a-z0-9-]+"
              :placeholder="t('channels.modal.placeholderName')"
              required
              type="text"
              @input="form.name = form.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')"
          />
          <p class="mt-1 text-xs text-text-muted">{{ t('channels.modal.nameHint') }}</p>
        </div>

        <div>
          <label class="form-label">{{ t('channels.modal.description') }}</label>
          <input
              v-model="form.description"
              class="form-input"
              :placeholder="t('channels.modal.placeholderDesc')"
              type="text"
          />
        </div>

        <div>
          <label class="form-label">{{ t('channels.modal.topic') }}</label>
          <select v-model="form.topicId" class="form-input">
            <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

        <div class="flex gap-3 pt-4">
          <button
              class="flex-1 btn-secondary"
              type="button"
              @click="$emit('close')"
          >
            {{ t('channels.modal.cancel') }}
          </button>
          <button
              :disabled="loading || !form.name"
              class="flex-1 btn-primary inline-flex justify-center items-center"
              type="submit"
          >
            <Loader2 v-if="loading" class="w-5 h-5 animate-spin mr-2"/>
            {{ t('channels.modal.submit') }}
          </button>
        </div>
      </form>

      <!-- Error Message -->
      <div v-if="error" class="mt-4 p-3 bg-danger/10 border border-danger/50 rounded-lg">
        <p class="text-sm text-danger">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {ref, computed} from 'vue'
import { useI18n } from 'vue-i18n'
import {useRouter} from 'vue-router'
import {useAppStore} from '@/stores/app'
import {useToast} from "@/composables/useToast";
import {Hash, Volume2, Loader2} from 'lucide-vue-next'

const props = defineProps({
  serverId: Number
})

const emit = defineEmits(['close', 'channel-created'])
const router = useRouter()
const appStore = useAppStore()
const {addToast} = useToast()
const { t } = useI18n()

const loading = ref(false)
const error = ref('')

const form = ref({
  name: '',
  description: '',
  type: 0, // 0 = Text, 1 = Voice
  topicId: null as number | null
})

const topics = computed(() => appStore.currentServer?.topics || [])

const handleCreateChannel = async () => {
  loading.value = true
  error.value = ''

  try {
    if (form.value.topicId === null && topics.value.length > 0) {
      form.value.topicId = topics.value[0].id
    }
    const response = await appStore.createChannel(props.serverId as number, form.value)
    emit('channel-created', response)
    emit('close')

    addToast({ message: t('channels.modal.toastCreated', { name: response.name }), type: 'success' })

    if (form.value.type === 0) {
      await router.push(`/servers/${props.serverId}/channels/${response.id}`)
    }
  } catch (err) {
    addToast({ message: t('channels.modal.toastCreateFailed'), type: 'danger' });
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@reference "@/style.css";

.channel-type-option {
  @apply flex items-center justify-center gap-2 p-3 bg-gray-700 border-2 border-gray-600
  rounded-lg cursor-pointer transition-all hover:border-gray-500;
}

.channel-type-option.active {
  @apply bg-primary/20 border-primary text-primary;
}
</style>
