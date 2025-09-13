<template>
  <div class="flex-1 flex items-center justify-center p-8">
    <div class="text-center max-w-md">
      <div class="mb-6">
        <MicOff class="w-16 h-16 mx-auto text-red-400 mb-4"/>
        <h2 class="text-2xl font-semibold text-text-default mb-2">{{ t('voice.mic.title') }}</h2>
        <p class="text-text-muted leading-relaxed">
          {{ t('voice.mic.description') }}
        </p>
      </div>
      
      <div class="space-y-4">
        <button
          @click="requestPermission"
          :disabled="isRequesting"
          class="w-full px-6 py-3 bg-primary hover:bg-primary/80 disabled:bg-primary/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Loader2 v-if="isRequesting" class="w-4 h-4 animate-spin"/>
          <Mic v-else class="w-4 h-4"/>
          {{ isRequesting ? t('voice.mic.requesting') : t('voice.mic.enable') }}
        </button>
        
        <button
          @click="goBack"
          class="w-full px-6 py-3 bg-main-700 hover:bg-main-600 text-text-default rounded-lg transition-colors"
        >
          {{ t('voice.mic.back') }}
        </button>
      </div>
      
      <div class="mt-8 p-4 bg-main-800 rounded-lg text-sm text-text-muted">
        <h3 class="font-medium text-text-default mb-2">{{ t('voice.mic.howTo.title') }}</h3>
        <ul class="text-left space-y-1">
          <li>{{ t('voice.mic.howTo.step1') }}</li>
          <li>{{ t('voice.mic.howTo.step2') }}</li>
          <li>{{ t('voice.mic.howTo.step3') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { MicOff, Mic, Loader2 } from 'lucide-vue-next';
import { checkMicrophonePermission } from '@/utils/permissions';
import { useToast } from '@/composables/useToast';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { addToast } = useToast();
const { t } = useI18n();

const isRequesting = ref(false);

const emit = defineEmits<{
  permissionGranted: [];
}>();

const requestPermission = async () => {
  isRequesting.value = true;
  
  try {
    const result = await checkMicrophonePermission();
    
    if (result.granted) {
      addToast({ message: t('voice.mic.toast.granted'), type: 'success' });
      emit('permissionGranted');
    } else {
      addToast({ message: result.error || t('voice.mic.toast.denied'), type: 'danger', duration: 5000 });
    }
  } catch (error: any) {
    const errText = error?.message || 'Unknown error';
    addToast({ message: t('voice.mic.toast.requestFailed', { error: errText }), type: 'danger' });
  } finally {
    isRequesting.value = false;
  }
};

const goBack = () => {
  router.go(-1);
};
</script>
