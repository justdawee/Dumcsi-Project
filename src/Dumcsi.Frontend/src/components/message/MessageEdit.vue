<template>
  <div class="w-full">
    <textarea
        ref="textarea"
        v-model="content"
        :style="{ height: textareaHeight }"
        class="form-input resize-none"
        rows="1"
        @keydown.enter.prevent="handleKeyDown"
        @keydown.escape="$emit('cancel')"
    />
    <div class="flex items-center gap-2 mt-2 text-xs">
      <span class="text-text-muted">
        Press <kbd class="px-1 py-0.5 bg-main-700 rounded-sm">Enter</kbd> to save,
        <kbd class="px-1 py-0.5 bg-main-700 rounded-sm">Esc</kbd> to cancel
      </span>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted, nextTick} from 'vue'

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