<script setup>
import { onMounted } from 'vue'
import { api } from './api/http'
import { clearSession, getToken, setSession } from './stores/session'

onMounted(async () => {
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
</template>
