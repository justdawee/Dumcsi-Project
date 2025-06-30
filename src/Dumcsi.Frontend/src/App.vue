<template>
  <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
    <div class="card max-w-md w-full">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">
          🎉 <span class="text-discord-blurple">Dumcsi</span> Frontend
        </h1>
        <p class="text-gray-300">Vue 3 + Vite + Tailwind CSS v4 + TypeScript</p>
      </div>

      <div class="space-y-4">
        <!-- Test buttons -->
        <div class="space-y-3">
          <button class="btn-primary w-full">Primary Button (Discord Blue)</button>
          <button class="btn-secondary w-full">Secondary Button (Gray)</button>
          <button class="btn-danger w-full">Danger Button (Discord Red)</button>
        </div>

        <!-- Test input -->
        <div>
          <input
            type="text"
            placeholder="Test input field with Discord styling"
            class="input-field w-full"
            v-model="testInput"
          />
          <p v-if="testInput" class="text-discord-green text-sm mt-2">You typed: {{ testInput }}</p>
        </div>

        <!-- Test color palette -->
        <div class="grid grid-cols-5 gap-2 mt-6">
          <div class="h-8 bg-discord-blurple rounded" title="Discord Blurple"></div>
          <div class="h-8 bg-discord-green rounded" title="Discord Green"></div>
          <div class="h-8 bg-discord-yellow rounded" title="Discord Yellow"></div>
          <div class="h-8 bg-discord-fuchsia rounded" title="Discord Fuchsia"></div>
          <div class="h-8 bg-discord-red rounded" title="Discord Red"></div>
        </div>

        <!-- Test server icons mockup -->
        <div class="flex justify-center space-x-2 mt-6">
          <div class="server-icon active">D</div>
          <div class="server-icon">T</div>
          <div class="server-icon">S</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const testInput = ref('')
</script>

<style scoped>
/* Component specific styles if needed */
</style>
