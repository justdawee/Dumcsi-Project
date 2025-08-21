<template>
  <div class="flex-1 flex items-center justify-center p-8">
    <div class="text-center max-w-md">
      <div class="mb-6">
        <MicOff class="w-16 h-16 mx-auto text-red-400 mb-4"/>
        <h2 class="text-2xl font-semibold text-text-default mb-2">Microphone Access Required</h2>
        <p class="text-text-muted leading-relaxed">
          You need to enable microphone access to join voice channels. 
          Please allow microphone permissions in your browser and try again.
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
          {{ isRequesting ? 'Requesting Permission...' : 'Enable Microphone' }}
        </button>
        
        <button
          @click="goBack"
          class="w-full px-6 py-3 bg-main-700 hover:bg-main-600 text-text-default rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
      
      <div class="mt-8 p-4 bg-main-800 rounded-lg text-sm text-text-muted">
        <h3 class="font-medium text-text-default mb-2">How to enable microphone access:</h3>
        <ul class="text-left space-y-1">
          <li>• Click the microphone icon in your browser's address bar</li>
          <li>• Select "Allow" for microphone access</li>
          <li>• Refresh the page if needed</li>
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

const router = useRouter();
const { addToast } = useToast();

const isRequesting = ref(false);

const emit = defineEmits<{
  permissionGranted: [];
}>();

const requestPermission = async () => {
  isRequesting.value = true;
  
  try {
    const result = await checkMicrophonePermission();
    
    if (result.granted) {
      addToast({
        message: 'Microphone access granted! You can now join voice channels.',
        type: 'success'
      });
      emit('permissionGranted');
    } else {
      addToast({
        message: result.error || 'Microphone permission was denied',
        type: 'danger',
        duration: 5000
      });
    }
  } catch (error: any) {
    addToast({
      message: `Failed to request microphone permission: ${error.message || 'Unknown error'}`,
      type: 'danger'
    });
  } finally {
    isRequesting.value = false;
  }
};

const goBack = () => {
  router.go(-1);
};
</script>