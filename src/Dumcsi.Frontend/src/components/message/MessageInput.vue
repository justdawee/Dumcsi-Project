<template>
  <div class="relative">
    <div class="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg">
      <button
        class="p-2 hover:bg-gray-600 rounded-lg transition shrink-0"
        title="Add attachment"
      >
        <Paperclip class="w-5 h-5 text-gray-400" />
      </button>

      <div class="flex-1 flex items-center">
        <textarea
          ref="textarea"
          v-model="message"
          @keydown.enter.prevent="handleKeyDown"
          @input="adjustHeight"
          :placeholder="`Message #${channelName}`"
          class="w-full px-4 py-2.5 bg-transparent text-gray-100 placeholder-gray-400 resize-none focus:outline-hidden rounded-lg"
          rows="1"
          :style="{ height: textareaHeight }"
        />
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button
          class="p-2 hover:bg-gray-600 rounded-lg transition"
          title="Add emoji"
        >
          <Smile class="w-5 h-5 text-gray-400" />
        </button>

        <button
          @click="sendMessage"
          :disabled="!canSend"
          class="p-2 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
          title="Send message"
        >
          <Send class="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>

    <!-- Character Counter -->
    <div
      v-if="message.length > 1800"
      class="absolute -top-8 right-4 text-xs"
      :class="message.length > 2000 ? 'text-red-400' : 'text-gray-400'"
    >
      {{ message.length }}/2000
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { Paperclip, Smile, Send } from "lucide-vue-next";

const props = defineProps({
  channelName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["send"]);

const message = ref("");
const textarea = ref(null);
const textareaHeight = ref("auto");

const canSend = computed(
  () => message.value.trim().length > 0 && message.value.length <= 2000
);

const adjustHeight = async () => {
  await nextTick();
  if (textarea.value) {
    textarea.value.style.height = "auto";
    const scrollHeight = textarea.value.scrollHeight;
    textareaHeight.value = `${Math.min(scrollHeight, 200)}px`; // Max height of 200px
  }
};

const sendMessage = () => {
  if (canSend.value) {
    emit("send", message.value.trim());
    message.value = "";
    textareaHeight.value = "auto";
  }
};

const handleKeyDown = (e) => {
  if (!e.shiftKey) {
    sendMessage();
  } else {
    // Allow new line with Shift+Enter
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    message.value =
      message.value.substring(0, start) + "\n" + message.value.substring(end);

    // Move cursor after the new line
    nextTick(() => {
      e.target.selectionStart = e.target.selectionEnd = start + 1;
      adjustHeight();
    });
  }
};
</script>
