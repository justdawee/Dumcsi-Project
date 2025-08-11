<template>
  <BaseModal
    :model-value="isOpen"
    title="Voice Connection Details"
    @close="$emit('close')"
  >
    <div class="space-y-4 text-sm">
      <!-- Connection Status -->
      <div class="bg-main-900 p-3 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <div :class="[
            'w-2 h-2 rounded-full',
            connectionQuality === 'excellent' ? 'bg-green-500' :
            connectionQuality === 'good' ? 'bg-yellow-500' :
            connectionQuality === 'poor' ? 'bg-red-500' : 'bg-gray-500'
          ]"></div>
          <span class="font-medium text-text-default">{{ connectionStatus }}</span>
        </div>
        <div class="text-xs text-text-muted">
          Connected for {{ connectedDuration }}
        </div>
      </div>

      <!-- Connection Info -->
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-text-muted">Server:</span>
          <span class="text-text-default">{{ serverUrl }}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-text-muted">Channel:</span>
          <span class="text-text-default">{{ channelName }}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-text-muted">Participants:</span>
          <span class="text-text-default">{{ participantCount }}</span>
        </div>
      </div>

      <!-- Technical Details -->
      <div class="border-t border-border-default pt-4 space-y-3">
        <div class="flex justify-between">
          <span class="text-text-muted">Audio Codec:</span>
          <span class="text-text-default">Opus</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-text-muted">Bitrate:</span>
          <span class="text-text-default">{{ audioBitrate }} kbps</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-text-muted">Latency:</span>
          <span class="text-text-default">{{ latency }}ms</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-text-muted">Packet Loss:</span>
          <span class="text-text-default">{{ packetLoss }}%</span>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import BaseModal from '@/components/modals/BaseModal.vue';
import { livekitService } from '@/services/livekitService';
import { useAppStore } from '@/stores/app';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
}

defineProps<Props>();
defineEmits<Emits>();

const appStore = useAppStore();

// Mock data for now - would be replaced with actual LiveKit stats
const connectionQuality = ref<'excellent' | 'good' | 'poor' | 'unknown'>('good');
const connectedDuration = ref('2:34');
const audioBitrate = ref(64);
const latency = ref(45);
const packetLoss = ref(0.1);

const connectionStatus = computed(() => {
  switch (connectionQuality.value) {
    case 'excellent': return 'Voice Connected - Excellent';
    case 'good': return 'Voice Connected - Good';
    case 'poor': return 'Voice Connected - Poor';
    default: return 'Voice Connected';
  }
});

const serverUrl = computed(() => {
  return import.meta.env.VITE_LIVEKIT_URL || 'ws://192.168.0.50:7880';
});

const channelName = computed(() => {
  const channelId = appStore.currentVoiceChannelId;
  if (!channelId || !appStore.currentServer) return 'Unknown Channel';
  
  const channel = appStore.currentServer.channels.find(c => c.id === channelId);
  return channel?.name || 'Voice Channel';
});

const participantCount = computed(() => {
  return livekitService.getTotalParticipantCount();
});

// TODO: Replace with actual LiveKit connection statistics
onMounted(() => {
  // Mock updating connection stats
  const updateStats = () => {
    latency.value = Math.round(Math.random() * 20 + 35);
    packetLoss.value = Math.round(Math.random() * 0.5 * 10) / 10;
  };
  
  const interval = setInterval(updateStats, 5000);
  
  // Cleanup
  onUnmounted(() => clearInterval(interval));
});
</script>