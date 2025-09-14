<template>
  <div class="h-full w-full bg-bg-base text-text-default">
    <div class="w-full px-6 py-8 max-w-5xl mx-auto">
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
          <Volume2 class="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ t('settings.sounds.title') }}</h1>
          <p class="mt-1 text-sm text-text-muted">{{ t('settings.sounds.subtitle') }}</p>
        </div>
      </header>

      <div class="space-y-6">
        <!-- Master toggle -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default flex items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold">{{ t('settings.sounds.master.enable') }}</h2>
              <p class="text-xs text-text-tertiary mt-1">{{ t('settings.sounds.subtitle') }}</p>
            </div>
            <button class="btn-secondary btn-xs" @click="resetSounds">{{ t('settings.sounds.resetAll') }}</button>
          </div>
          <div class="p-5 flex items-center justify-between">
            <div class="text-sm text-text-secondary">{{ t('settings.sounds.master.enable') }}</div>
            <input type="checkbox" v-model="masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110" />
          </div>
        </section>

        <!-- Friends -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.sounds.friends.title') }}</h2>
          </div>
          <div class="p-5 space-y-4" :class="!masterEnabled ? 'opacity-60 pointer-events-none select-none' : ''">
            <div class="flex items-center justify-between">
              <div class="font-medium">{{ t('settings.sounds.friends.request') }}</div>
              <input type="checkbox" v-model="friendRequest.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div class="text-sm text-text-secondary">{{ t('settings.sounds.common.volume') }}</div>
              <input type="range" min="0" max="1" step="0.01" v-model.number="friendRequest.volume" :disabled="!masterEnabled || !friendRequest.enabled" class="w-full sm:col-span-1" />
              <div class="text-right text-sm text-text-muted">{{ Math.round(friendRequest.volume * 100) }}%</div>
            </div>
            <div class="flex gap-3">
              <button class="btn-primary btn-xs" @click="test('friendRequest')" :disabled="!masterEnabled || !friendRequest.enabled">{{ t('settings.sounds.common.test') }}</button>
            </div>
          </div>
        </section>

        <!-- Voice -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.sounds.voice.title') }}</h2>
          </div>
          <div class="p-5 space-y-4" :class="!masterEnabled ? 'opacity-60 pointer-events-none select-none' : ''">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.voice.joinSelf') }}</div>
                  <input type="checkbox" v-model="voiceJoinSelf.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.voice.leaveSelf') }}</div>
                  <input type="checkbox" v-model="voiceLeaveSelf.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.voice.joinOther') }}</div>
                  <input type="checkbox" v-model="voiceJoinOther.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
              </div>
              <div class="space-y-3">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.voice.joinVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceJoinSelf.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceJoinSelf.volume" :disabled="!masterEnabled || !voiceJoinSelf.enabled" class="w-full" />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.voice.leaveVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceLeaveSelf.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceLeaveSelf.volume" :disabled="!masterEnabled || !voiceLeaveSelf.enabled" class="w-full" />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.voice.otherJoinVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(voiceJoinOther.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="voiceJoinOther.volume" :disabled="!masterEnabled || !voiceJoinOther.enabled" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="btn-primary btn-xs" @click="test('voiceJoinSelf')" :disabled="!masterEnabled || !voiceJoinSelf.enabled">{{ t('settings.sounds.voice.testJoin') }}</button>
              <button class="btn-primary btn-xs" @click="test('voiceLeaveSelf')" :disabled="!masterEnabled || !voiceLeaveSelf.enabled">{{ t('settings.sounds.voice.testLeave') }}</button>
              <button class="btn-primary btn-xs" @click="test('voiceJoinOther')" :disabled="!masterEnabled || !voiceJoinOther.enabled">{{ t('settings.sounds.voice.testOtherJoins') }}</button>
            </div>
          </div>
        </section>

        <!-- Screen Share -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.sounds.screen.title') }}</h2>
          </div>
          <div class="p-5 space-y-4" :class="!masterEnabled ? 'opacity-60 pointer-events-none select-none' : ''">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.screen.start') }}</div>
                  <input type="checkbox" v-model="screenShareStart.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.screen.stop') }}</div>
                  <input type="checkbox" v-model="screenShareStop.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
              </div>
              <div class="space-y-3">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.screen.startVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(screenShareStart.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="screenShareStart.volume" :disabled="!masterEnabled || !screenShareStart.enabled" class="w-full" />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.screen.stopVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(screenShareStop.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="screenShareStop.volume" :disabled="!masterEnabled || !screenShareStop.enabled" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="btn-primary btn-xs" @click="test('screenShareStart')" :disabled="!masterEnabled || !screenShareStart.enabled">{{ t('settings.sounds.screen.testStart') }}</button>
              <button class="btn-primary btn-xs" @click="test('screenShareStop')" :disabled="!masterEnabled || !screenShareStop.enabled">{{ t('settings.sounds.screen.testStop') }}</button>
            </div>
          </div>
        </section>

        <!-- Microphone & Deafen -->
        <section class="bg-bg-surface rounded-2xl shadow border border-border-default overflow-hidden">
          <div class="p-5 border-b border-border-default">
            <h2 class="text-lg font-semibold">{{ t('settings.sounds.mic.title') }}</h2>
          </div>
          <div class="p-5 space-y-4" :class="!masterEnabled ? 'opacity-60 pointer-events-none select-none' : ''">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.mic.mute') }}</div>
                  <input type="checkbox" v-model="micMute.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.mic.unmute') }}</div>
                  <input type="checkbox" v-model="micUnmute.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.mic.deafenOn') }}</div>
                  <input type="checkbox" v-model="deafenOn.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="font-medium">{{ t('settings.sounds.mic.deafenOff') }}</div>
                  <input type="checkbox" v-model="deafenOff.enabled" :disabled="!masterEnabled" class="h-5 w-5 rounded border-border-default bg-bg-base text-primary focus:ring-2 focus:ring-primary/50 transition-transform scale-110 disabled:opacity-50" />
                </div>
              </div>
              <div class="space-y-3">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.mic.muteVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(micMute.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="micMute.volume" :disabled="!masterEnabled || !micMute.enabled" class="w-full" />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.mic.unmuteVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(micUnmute.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="micUnmute.volume" :disabled="!masterEnabled || !micUnmute.enabled" class="w-full" />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.mic.deafenOnVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(deafenOn.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="deafenOn.volume" :disabled="!masterEnabled || !deafenOn.enabled" class="w-full" />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <div class="text-sm text-text-secondary">{{ t('settings.sounds.mic.deafenOffVolume') }}</div>
                    <div class="text-sm text-text-muted">{{ Math.round(deafenOff.volume * 100) }}%</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="deafenOff.volume" :disabled="!masterEnabled || !deafenOff.enabled" class="w-full" />
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-3">
              <button class="btn-primary btn-xs" @click="test('micMute')" :disabled="!masterEnabled || !micMute.enabled">{{ t('settings.sounds.mic.testMute') }}</button>
              <button class="btn-primary btn-xs" @click="test('micUnmute')" :disabled="!masterEnabled || !micUnmute.enabled">{{ t('settings.sounds.mic.testUnmute') }}</button>
              <button class="btn-primary btn-xs" @click="test('deafenOn')" :disabled="!masterEnabled || !deafenOn.enabled">{{ t('settings.sounds.mic.testDeafenOn') }}</button>
              <button class="btn-primary btn-xs" @click="test('deafenOff')" :disabled="!masterEnabled || !deafenOff.enabled">{{ t('settings.sounds.mic.testDeafenOff') }}</button>
            </div>
          </div>
        </section>
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

function resetSounds() {
  ui.reset();
}
</script>
