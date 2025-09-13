<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Volume2 class="w-7 h-7 text-primary"/>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.sounds.title') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.sounds.subtitle') }}</p>
        </div>
      </header>

      <div class="bg-bg-surface rounded-2xl shadow-lg border border-border-default overflow-hidden">
        <div class="p-6 space-y-8">

          <section>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">{{ t('settings.sounds.master.enable') }}</div>
              <input type="checkbox" v-model="masterEnabled" />
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Friend Request -->
          <section>
            <h2 class="text-xl font-semibold mb-2">{{ t('settings.sounds.friends.title') }}</h2>
            <div class="flex items-center justify-between py-3">
              <div class="font-medium">{{ t('settings.sounds.friends.request') }}</div>
              <input type="checkbox" v-model="friendRequest.enabled" />
            </div>
            <div class="py-3">
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">{{ t('settings.sounds.common.volume') }}</div>
                <div class="text-sm text-text-muted">{{ Math.round(friendRequest.volume * 100) }}%</div>
              </div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="friendRequest.volume" class="w-full" />
            </div>
            <div class="flex gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('friendRequest')">{{ t('settings.sounds.common.test') }}</button>
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Voice -->
          <section>
            <h2 class="text-xl font-semibold mb-2">{{ t('settings.sounds.voice.title') }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.voice.joinSelf') }}</div>
                  <input type="checkbox" v-model="voiceJoinSelf.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.voice.leaveSelf') }}</div>
                  <input type="checkbox" v-model="voiceLeaveSelf.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.voice.joinOther') }}</div>
                  <input type="checkbox" v-model="voiceJoinOther.enabled" />
                </div>
              </div>
              <div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.voice.joinVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceJoinSelf.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceJoinSelf.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.voice.leaveVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceLeaveSelf.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceLeaveSelf.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.voice.otherJoinVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceJoinOther.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceJoinOther.volume" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('voiceJoinSelf')">{{ t('settings.sounds.voice.testJoin') }}</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('voiceLeaveSelf')">{{ t('settings.sounds.voice.testLeave') }}</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('voiceJoinOther')">{{ t('settings.sounds.voice.testOtherJoins') }}</button>
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Screen Share -->
          <section>
            <h2 class="text-xl font-semibold mb-2">{{ t('settings.sounds.screen.title') }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.screen.start') }}</div>
                  <input type="checkbox" v-model="screenShareStart.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.screen.stop') }}</div>
                  <input type="checkbox" v-model="screenShareStop.enabled" />
                </div>
              </div>
              <div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.screen.startVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(screenShareStart.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="screenShareStart.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.screen.stopVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(screenShareStop.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="screenShareStop.volume" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('screenShareStart')">{{ t('settings.sounds.screen.testStart') }}</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('screenShareStop')">{{ t('settings.sounds.screen.testStop') }}</button>
            </div>
          </section>

          <div class="h-px bg-border-default"></div>

          <!-- Mic/Deafen -->
          <section>
            <h2 class="text-xl font-semibold mb-2">{{ t('settings.sounds.mic.title') }}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.mic.mute') }}</div>
                  <input type="checkbox" v-model="micMute.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.mic.unmute') }}</div>
                  <input type="checkbox" v-model="micUnmute.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.mic.deafenOn') }}</div>
                  <input type="checkbox" v-model="deafenOn.enabled" />
                </div>
                <div class="flex items-center justify-between py-2">
                  <div class="font-medium">{{ t('settings.sounds.mic.deafenOff') }}</div>
                  <input type="checkbox" v-model="deafenOff.enabled" />
                </div>
              </div>
              <div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.mic.muteVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(micMute.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="micMute.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.mic.unmuteVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(micUnmute.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="micUnmute.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.mic.deafenOnVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(deafenOn.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="deafenOn.volume" class="w-full" />
                </div>
                <div class="py-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="font-medium">{{ t('settings.sounds.mic.deafenOffVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(deafenOff.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="deafenOff.volume" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('micMute')">{{ t('settings.sounds.mic.testMute') }}</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('micUnmute')">{{ t('settings.sounds.mic.testUnmute') }}</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('deafenOn')">{{ t('settings.sounds.mic.testDeafenOn') }}</button>
              <button class="px-3 py-1.5 rounded-md bg-primary text-white text-sm" @click="test('deafenOff')">{{ t('settings.sounds.mic.testDeafenOff') }}</button>
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
import { useI18n } from 'vue-i18n';

const ui = useUiSounds();
const { t } = useI18n();

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
