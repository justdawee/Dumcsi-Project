<template>
  <Transition name="modal-fade">
    <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm"
        @click.self="closeModal"
    >
      <div
          class="w-full max-w-4xl h-[80vh] flex flex-col transform rounded-2xl bg-bg-surface text-left align-middle shadow-xl transition-all border border-border-default/50">
        <div class="p-6 border-b border-border-default/50 flex-shrink-0">
          <h3 class="text-xl font-bold text-text-default">Explore Public Servers</h3>
          <p class="text-sm text-text-muted mt-1">Find new communities to join.</p>
        </div>

        <div v-if="loading" class="flex-1 flex items-center justify-center">
          <Loader2 class="w-10 h-10 text-primary animate-spin"/>
        </div>
        <div v-else-if="error" class="flex-1 flex items-center justify-center text-center">
          <div>
            <p class="text-danger">Failed to load servers.</p>
            <button class="btn-secondary mt-2" @click="fetchPublicServers">Try Again</button>
          </div>
        </div>

        <div v-else class="flex-1 p-6 overflow-y-auto scrollbar-thin">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
                v-for="server in servers"
                :key="server.id"
                class="group bg-main-700 rounded-xl p-4 transition-all shadow-md flex flex-col"
            >
              <div class="flex items-center gap-4 mb-3">
                <div
                    class="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img v-if="server.icon" :alt="server.name" :src="server.icon" class="w-full h-full object-cover"/>
                  <span v-else class="text-lg font-bold text-primary">{{ getServerInitials(server.name) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-text-default truncate">{{ server.name }}</h3>
                  <p class="text-sm text-text-muted">{{ server.memberCount }}
                    {{ server.memberCount === 1 ? 'member' : 'members' }}</p>
                </div>
              </div>
              <p class="text-sm text-text-muted line-clamp-3 flex-grow min-h-[60px]">
                {{ server.description || 'No description provided.' }}
              </p>
              <button
                  :disabled="isJoining(server.id).value || isMember(server.id).value"
                  class="btn-primary mt-4 w-full"
                  @click="joinServer(server)">
                    <span v-if="isJoining(server.id).value">
                        <Loader2 class="w-5 h-5 animate-spin mx-auto"/>
                    </span>
                <span v-else-if="isMember(server.id).value">
                        Already a Member
                    </span>
                <span v-else>
                        Join Server
                    </span>
              </button>
            </div>
          </div>
        </div>

        <div class="p-4 bg-bg-base/40 border-t border-border-default/50 flex-shrink-0 text-right">
          <button class="btn-secondary" @click="closeModal">Close</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import {ref, onMounted, reactive, computed} from 'vue';
import {useRouter} from 'vue-router';
import {useAppStore} from '@/stores/app';
import {useToast} from '@/composables/useToast';
import serverService from '@/services/serverService';
import type {ServerListItem} from '@/services/types';
import {Loader2} from 'lucide-vue-next';

// --- Props & Emits ---
defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['update:modelValue']);

// --- State ---
const router = useRouter();
const appStore = useAppStore();
const {addToast} = useToast();
const servers = ref<ServerListItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const joiningState = reactive<Record<number, boolean>>({});

// --- Computed ---
const isJoining = (serverId: number) => computed(() => joiningState[serverId] || false);
const isMember = (serverId: number) => computed(() => appStore.servers.some(s => s.id === serverId));

// --- Methods ---
const closeModal = () => {
  emit('update:modelValue', false);
};

const fetchPublicServers = async () => {
  loading.value = true;
  error.value = null; // Hiba resetelése újratöltéskor
  try {
    // A serverService már a helyes, letisztult ServerListItem[]-et adja vissza
    servers.value = await serverService.getPublicServers();
  } catch (err: any) {
    error.value = 'Failed to load servers.';
    addToast({
      type: 'danger',
      message: 'Failed to fetch public servers.'
    });
  } finally {
    loading.value = false;
  }
};

const joinServer = async (server: ServerListItem) => {
  if (isMember(server.id).value) {
    router.push(`/servers/${server.id}`);
    closeModal();
    return;
  }

  joiningState[server.id] = true;
  try {
    const result = await appStore.joinPublicServer(server.id);
    if (result?.serverId) {
      addToast({
        type: 'success',
        message: `Successfully joined ${server.name}.`
      });
      router.push(`/servers/${result.serverId}`);
      closeModal();
    }
  } catch (err) {
    addToast({
      type: 'danger',
      message: 'Failed to join server.'
    });
  } finally {
    joiningState[server.id] = false;
  }
};

const getServerInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

onMounted(() => {
  fetchPublicServers();
});
</script>