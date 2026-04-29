<script setup>
import { useSession } from '../stores/session'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '删除确认'
  },
  message: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: '删除后不可恢复，请谨慎操作。'
  },
  confirmText: {
    type: String,
    default: '确认删除'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  loadingText: {
    type: String,
    default: '处理中...'
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])
const session = useSession()

function closeDialog() {
  if (props.loading) {
    return
  }
  emit('update:modelValue', false)
  emit('cancel')
}

function submitDialog() {
  if (props.loading) {
    return
  }
  emit('confirm')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal-mask confirm-dialog-mask"
      :class="{ 'is-light-theme': session.theme === 'light', 'is-dark-theme': session.theme !== 'light' }"
      @click.self="closeDialog"
    >
      <div
        class="modal-panel glass-card confirm-dialog"
        :class="{ 'is-light-theme': session.theme === 'light', 'is-dark-theme': session.theme !== 'light' }"
        role="alertdialog"
        aria-modal="true"
      >
        <div class="confirm-dialog-symbol" aria-hidden="true">!</div>

        <div class="confirm-dialog-copy">
          <h3>{{ title }}</h3>
          <p v-if="message" class="confirm-dialog-message">{{ message }}</p>
          <p v-if="description" class="confirm-dialog-description">{{ description }}</p>
        </div>

        <div class="modal-actions confirm-dialog-actions">
          <button type="button" class="pill-button ghost" :disabled="loading" @click="closeDialog">
            {{ cancelText }}
          </button>
          <button type="button" class="pill-button danger-button" :disabled="loading" @click="submitDialog">
            {{ loading ? loadingText : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
