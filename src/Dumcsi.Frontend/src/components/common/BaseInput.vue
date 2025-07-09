<template>
  <div class="space-y-1">
    <label v-if="label" :for="id" class="block text-sm font-medium text-discord-gray-300">
      {{ label }}
      <span v-if="required" class="text-discord-red ml-1">*</span>
    </label>
    
    <div class="relative">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :class="inputClasses"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        @keydown="$emit('keydown', $event)"
        @keyup="$emit('keyup', $event)"
      />
      
      <div v-if="$slots.suffix" class="absolute inset-y-0 right-0 flex items-center pr-3">
        <slot name="suffix" />
      </div>
    </div>
    
    <p v-if="error" class="text-sm text-discord-red">{{ error }}</p>
    <p v-else-if="hint" class="text-sm text-discord-gray-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  id?: string
  label?: string
  type?: string
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  modelValue: '',
  disabled: false,
  required: false
})

defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
  keyup: [event: KeyboardEvent]
}>()

const inputClasses = computed(() => {
  const baseClasses = 'w-full px-3 py-2 bg-discord-gray-800 border border-discord-gray-600 rounded-md text-white placeholder-discord-gray-400 transition-colors duration-150 input-focus'
  const errorClasses = props.error ? 'border-discord-red focus:ring-discord-red' : ''
  const disabledClasses = props.disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  return [baseClasses, errorClasses, disabledClasses].join(' ')
})
</script>