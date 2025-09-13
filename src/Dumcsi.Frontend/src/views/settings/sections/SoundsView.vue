<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Volume2 class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">UI Sounds</h1>
          <p class="mt-1 text-sm text-text-muted">Enable and adjust sounds for common actions</p>
        </div>
      </header>

      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden">
        <div class="p-6 space-y-8">

          <section>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Enable UI Sounds</div>
              <input type="checkbox" v-model="masterEnabled" />
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Friend Request -->
          <section>
            <h2 class="text-xl font-semibold mb-2">Friends</h2>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">Friend request</div>
              <input type="checkbox" v-model="friendRequest.enabled" />
            </div>
            <div class="py-3">
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">Volume</div>
                <div class="text-sm text-text-muted">{{ Math.round(friendRequest.volume * 100) }}%</div>
              </div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="friendRequest.volume" class="w-full" />
            </div>
            <div class="flex gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('friendRequest')">Test</button>
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Voice -->
          <section>
            <h2 class="text-xl font-semibold mb-2">Voice</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Join (you)</div>
                  <input type="checkbox" v-model="voiceJoinSelf.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Leave (you)</div>
                  <input type="checkbox" v-model="voiceLeaveSelf.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Someone joins</div>
                  <input type="checkbox" v-model="voiceJoinOther.enabled" />
                </div>
              </div>
              <div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Join volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceJoinSelf.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceJoinSelf.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Leave volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceLeaveSelf.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceLeaveSelf.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Other join volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceJoinOther.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceJoinOther.volume" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('voiceJoinSelf')">Test Join</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('voiceLeaveSelf')">Test Leave</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('voiceJoinOther')">Test Other Joins</button>
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Screen Share -->
          <section>
            <h2 class="text-xl font-semibold mb-2">Screen Share</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Start</div>
                  <input type="checkbox" v-model="screenShareStart.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Stop</div>
                  <input type="checkbox" v-model="screenShareStop.enabled" />
                </div>
              </div>
              <div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Start volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(screenShareStart.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="screenShareStart.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Stop volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(screenShareStop.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="screenShareStop.volume" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('screenShareStart')">Test Start</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('screenShareStop')">Test Stop</button>
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Mic/Deafen -->
          <section>
            <h2 class="text-xl font-semibold mb-2">Microphone & Deafen</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Mic mute</div>
                  <input type="checkbox" v-model="micMute.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Mic unmute</div>
                  <input type="checkbox" v-model="micUnmute.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Deafen on</div>
                  <input type="checkbox" v-model="deafenOn.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">Deafen off</div>
                  <input type="checkbox" v-model="deafenOff.enabled" />
                </div>
              </div>
              <div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Mic mute volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(micMute.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="micMute.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Mic unmute volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(micUnmute.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="micUnmute.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Deafen on volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(deafenOn.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="deafenOn.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">Deafen off volume</div>
                    <div class="text-sm text-text-muted">{{ Math.round(deafenOff.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="deafenOff.volume" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('micMute')">Test Mic Mute</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('micUnmute')">Test Mic Unmute</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('deafenOn')">Test Deafen On</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('deafenOff')">Test Deafen Off</button>
            </div>
          </section>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Volume2 } from 'lucide-vue-next';
import { computed } from 'vue';
import { useUiSounds, type UiSoundKey } from '@/stores/uiSounds';

const ui = useUiSounds();

const masterEnabled = computed({
  get: () => ui.prefs.masterEnabled,
  set: (v: boolean) => ui.setMasterEnabled(v)
});

const bind = (key: UiSoundKey) => computed({
  get: () => ui.prefs[key],
  set: (val: { enabled: boolean; volume: number }) => {
    ui.setEnabled(key, val.enabled);
    ui.setVolume(key, val.volume);
  }
});

const friendRequest = bind('friendRequest');
const voiceJoinSelf = bind('voiceJoinSelf');
const voiceLeaveSelf = bind('voiceLeaveSelf');
const voiceJoinOther = bind('voiceJoinOther');
const screenShareStart = bind('screenShareStart');
const screenShareStop = bind('screenShareStop');
const micMute = bind('micMute');
const micUnmute = bind('micUnmute');
const deafenOn = bind('deafenOn');
const deafenOff = bind('deafenOff');

function test(key: UiSoundKey) {
  ui.play(key);
}
</script>

