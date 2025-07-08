<template>
  <div class="w-full">
    <textarea
      ref="textarea"
      v-model="content"
      @keydown.enter.prevent="handleKeyDown"
      @keydown.escape="$emit('cancel')"
      class="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded resize-none
             focus:outline-hidden focus:ring-2 focus:ring-primary/50"
      rows="1"
      :style="{ height: textareaHeight }"
    />
    <div class="flex items-center gap-2 mt-2 text-xs">
      <span class="text-gray-400">
        Press <kbd class="px-1 py-0.5 bg-gray-700 rounded-sm">Enter</kbd> to save,
        <kbd class="px-1 py-0.5 bg-gray-700 rounded-sm">Esc</kbd> to cancel
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  initialContent: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['save', 'cancel'])

const content = ref(props.initialContent)
const textarea = ref(null)
const textareaHeight = ref('auto')

const adjustHeight = async () => {
  await nextTick()
  if (textarea.value) {
    textarea.value.style.height = 'auto'
    textareaHeight.value = `${textarea.value.scrollHeight}px`
  }
}

const handleKeyDown = (e) => {
  if (!e.shiftKey && content.value.trim()) {
    emit('save', content.value.trim())
  }
}

onMounted(() => {
  adjustHeight()
  textarea.value?.focus()
  textarea.value?.select()
})
</script>