<template>
  <div
    v-if="show"
    class="fixed z-50 py-2 bg-gray-950 border border-gray-700 rounded-lg shadow-xl animate-fade-in"
    :style="{ top: `${y}px`, left: `${x}px` }"
    @click.stop
    v-click-outside="close"
  >
    <ul>
      <li v-for="(item, index) in items" :key="index">
        <button
          @click="item.action"
          class="w-full text-left px-4 py-1.5 text-sm text-gray-300 hover:bg-primary hover:text-white flex items-center gap-2"
          :class="{ 'text-danger hover:bg-danger': item.danger }"
        >
          <component v-if="item.icon" :is="item.icon" class="w-4 h-4" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  items: Array,
});

const show = ref(false);
const x = ref(0);
const y = ref(0);

const open = (event) => {
  event.preventDefault();
  x.value = event.clientX;
  y.value = event.clientY;
  show.value = true;
};

const close = () => {
  show.value = false;
};

// Expose open/close methods to parent
defineExpose({ open, close });

// Custom directive to detect outside clicks
const vClickOutside = {
  mounted(el, binding) {
    el.__ClickOutsideHandler__ = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.body.addEventListener('click', el.__ClickOutsideHandler__);
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.__ClickOutsideHandler__);
  },
};
</script>