<script setup>
import { onMounted } from 'vue'
import { api } from './api/http'
import { clearSession, getToken, setSession } from './stores/session'
import { useToast } from './stores/toast'
import AppToast from './components/AppToast.vue'

const { show } = useToast()

onMounted(async () => {
  window.alert = (message) => {
    show(String(message))
  }

  const token = getToken()
  if (!token) {
    return
  }

  try {
    const profile = await api.get('/api/auth/me')
    setSession(token, profile)
  } catch (error) {
    clearSession()
  }
})
</script>

<template>
  <router-view />
  <AppToast />
</template>
