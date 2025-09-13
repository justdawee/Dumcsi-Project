<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <!-- Content Container -->
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Bell class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Notifications</h1>
          <p class="mt-1 text-sm text-text-muted">Control when and how you receive notifications</p>
        </div>
      </header>

      <!-- Notification Settings -->
      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden">
        <div class="p-6 space-y-8">
          

          <!-- Category: Server -->
          <section>
            <h2 class="text-xl font-semibold mb-2">Server Notifications</h2>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Enable</div>
              <input type="checkbox" v-model="server.enabled" />
            </div>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Play Sound</div>
              <input type="checkbox" v-model="server.playSound" />
            </div>
            <div class="py-3">
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">Volume</div>
                <div class="text-sm text-text-muted">{{ Math.round(server.volume * 100) }}%</div>
              </div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="server.volume" class="w-full" />
            </div>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Respect Do Not Disturb</div>
              <input type="checkbox" v-model="server.respectDnd" />
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Category: DM -->
          <section>
            <h2 class="text-xl font-semibold mb-2">Direct Messages</h2>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Enable</div>
              <input type="checkbox" v-model="dm.enabled" />
            </div>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Play Sound</div>
              <input type="checkbox" v-model="dm.playSound" />
            </div>
            <div class="py-3">
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">Volume</div>
                <div class="text-sm text-text-muted">{{ Math.round(dm.volume * 100) }}%</div>
              </div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="dm.volume" class="w-full" />
            </div>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Respect Do Not Disturb</div>
              <input type="checkbox" v-model="dm.respectDnd" />
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Category: UI Toasts -->
          <section>
            <h2 class="text-xl font-semibold mb-2">In-App Toasts</h2>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Enable</div>
              <input type="checkbox" v-model="toast.enabled" />
            </div>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Play Sound</div>
              <input type="checkbox" v-model="toast.playSound" />
            </div>
            <div class="py-3">
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">Volume</div>
                <div class="text-sm text-text-muted">{{ Math.round(toast.volume * 100) }}%</div>
              </div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="toast.volume" class="w-full" />
            </div>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Respect Do Not Disturb</div>
              <input type="checkbox" v-model="toast.respectDnd" />
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Test Buttons -->
          <section class="pb-2">
            <h2 class="text-xl font-semibold mb-2">Test</h2>
            <div class="flex flex-wrap gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('server')">Test Server</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('dm')">Test DM</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('toast')">Test Toast</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bell } from 'lucide-vue-next';
import { computed } from 'vue';
import { useNotificationCenter } from '@/stores/notificationCenter';
import { useNotify } from '@/composables/useNotify';

const nc = useNotificationCenter();

const server = computed({
  get: () => nc.prefs.categories.server,
  set: (val) => {
    nc.setCategoryEnabled('server', val.enabled);
    nc.setCategoryPlaySound('server', val.playSound);
    nc.setCategoryRespectDnd('server', val.respectDnd);
    nc.setCategoryVolume('server', val.volume);
  }
});
const dm = computed({
  get: () => nc.prefs.categories.dm,
  set: (val) => {
    nc.setCategoryEnabled('dm', val.enabled);
    nc.setCategoryPlaySound('dm', val.playSound);
    nc.setCategoryRespectDnd('dm', val.respectDnd);
    nc.setCategoryVolume('dm', val.volume);
  }
});
const toast = computed({
  get: () => nc.prefs.categories.toast,
  set: (val) => {
    nc.setCategoryEnabled('toast', val.enabled);
    nc.setCategoryPlaySound('toast', val.playSound);
    nc.setCategoryRespectDnd('toast', val.respectDnd);
    nc.setCategoryVolume('toast', val.volume);
  }
});


const { notify } = useNotify();
function test(kind: 'server' | 'dm' | 'toast') {
  const title = kind === 'server' ? 'Server • #general' : (kind === 'dm' ? 'Direct Message' : 'Toast');
  const msg = kind === 'server' ? 'Alice: Hello server!' : (kind === 'dm' ? 'Bob: Hey there!' : 'This is a UI toast');
  notify({ category: kind, title, message: msg, showToast: true, playSound: true });
}
</script>
