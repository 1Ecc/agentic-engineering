<script setup lang="ts">
import { ref } from 'vue'
import { authFinish, authStart, authStatus, type AuthPlatformStatus } from '../lib/api'

const props = defineProps<{ disabled?: boolean }>()

const busy = ref(false)
const message = ref('运行前请先确认服务云、九丘、SPOS 登录态可用。')
const statuses = ref<AuthPlatformStatus[]>([])

async function openLogin() {
  if (busy.value || props.disabled) return
  busy.value = true
  try {
    const result = await authStart()
    message.value = result.message
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error)
  } finally {
    busy.value = false
  }
}

async function finishLogin() {
  if (busy.value || props.disabled) return
  busy.value = true
  try {
    const result = await authFinish()
    message.value = `登录态已保存：${result.state_path}`
    await checkStatus()
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error)
  } finally {
    busy.value = false
  }
}

async function checkStatus() {
  if (busy.value || props.disabled) return
  busy.value = true
  try {
    const result = await authStatus()
    statuses.value = result.platforms
    const failed = result.platforms.filter((item) => !item.ok)
    message.value = failed.length ? `${failed.map((item) => item.platform).join('、')} 登录态不可用` : '全部平台登录态可用'
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <div class="auth-actions">
      <button type="button" :disabled="busy || disabled" @click="openLogin">打开登录浏览器</button>
      <button type="button" :disabled="busy || disabled" @click="finishLogin">保存登录态</button>
      <button type="button" :disabled="busy || disabled" @click="checkStatus">检查登录态</button>
    </div>
    <p class="auth-message">{{ message }}</p>
    <div v-if="statuses.length" class="auth-statuses">
      <span v-for="item in statuses" :key="item.platform" :class="{ ok: item.ok }">
        {{ item.platform }}：{{ item.ok ? '可用' : '失效' }}
      </span>
    </div>
  </div>
</template>
