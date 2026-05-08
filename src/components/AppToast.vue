<script setup>
import { useToast } from '../stores/toast'

const { messages, dismissAll } = useToast()
</script>

<template>
  <TransitionGroup
    v-if="messages.length"
    tag="div"
    class="toast-overlay"
    name="toast-fade"
    @click="dismissAll"
  >
    <div v-for="msg in messages" :key="msg.id" class="toast-card">
      {{ msg.message }}
    </div>
  </TransitionGroup>
</template>

<style scoped>
.toast-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99999;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  pointer-events: auto;
}

.toast-card {
  margin-top: 20px;
  margin-right: 30vw;
  padding: 12px 24px;
  max-width: 420px;
  background: transparent;
  border: none;
  box-shadow: none;
  border-radius: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #eab308;
  word-break: break-word;
  pointer-events: auto;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
