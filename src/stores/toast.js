import { ref } from 'vue'

const messages = ref([])
let toastId = 0

export function useToast() {
  function show(message, duration = 5000) {
    const id = ++toastId
    messages.value.push({ id, message })
    setTimeout(() => {
      messages.value = messages.value.filter(m => m.id !== id)
    }, duration)
  }

  function dismissAll() {
    messages.value = []
  }

  return { messages, show, dismissAll }
}
