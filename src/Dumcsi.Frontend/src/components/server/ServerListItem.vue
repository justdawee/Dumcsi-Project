<template>
  <div class="server-info">
    <h3>{{ server.name }}</h3>
    <p class="text-sm text-gray-400">
      Owner: {{ server.ownerGlobalNickname || server.ownerUsername }}
    </p>
  </div>
</template>

<script setup>
import {useUserDisplay} from '@/composables/useUserDisplay';

const {getDisplayName} = useUserDisplay();
</script>