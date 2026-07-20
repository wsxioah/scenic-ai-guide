<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const account = ref('')
const password = ref('')
const code = ref('')
const loginMode = ref<'password' | 'code'>('password')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!account.value) {
    error.value = '请输入账号'
    return
  }
  if (loginMode.value === 'password' && !password.value) {
    error.value = '请输入密码'
    return
  }
  if (loginMode.value === 'code' && !code.value) {
    error.value = '请输入验证码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body: Record<string, string> = { account: account.value }
    if (loginMode.value === 'password') {
      body.password = password.value
    } else {
      body.code = code.value || '0000'
    }
    const { data } = await axios.post('/api/auth/login', body)
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_user', JSON.stringify({ id: data.id, phone: data.phone, nickname: data.nickname }))
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    router.replace('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.detail || '登录失败，请稍后重试'
  }
  loading.value = false
}
</script>

<template>
  <div class="login-container">
    <div class="login-panel">
      <div class="brand">
        <div class="brand-seal">禅</div>
        <h1>灵山胜境</h1>
        <p class="brand-sub">AI 数字人导览 · 管理后台</p>
      </div>
      <a-form layout="vertical" @submit.prevent="handleLogin">
        <a-form-item label="账号">
          <a-input v-model:value="account" size="large" placeholder="请输入账号" />
        </a-form-item>

        <template v-if="loginMode === 'password'">
          <a-form-item label="密码">
            <a-input-password v-model:value="password" size="large" placeholder="请输入密码" />
          </a-form-item>
        </template>

        <template v-else>
          <a-form-item label="验证码">
            <a-input v-model:value="code" size="large" placeholder="请输入验证码（开发模式: 0000）" />
          </a-form-item>
        </template>

        <a-form-item v-if="error">
          <a-alert :message="error" type="error" show-icon />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="loading" block size="large">
            登 录
          </a-button>
        </a-form-item>
      </a-form>
      <div style="text-align: center; margin-bottom: 16px;">
        <a-button type="link" size="small" @click="loginMode = loginMode === 'password' ? 'code' : 'password'">
          {{ loginMode === 'password' ? '使用验证码登录' : '使用密码登录' }}
        </a-button>
      </div>
      <p class="foot">灵山胜境 · 智慧景区管理系统</p>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F2EC;
  background-image:
    radial-gradient(ellipse 80% 60% at 70% 20%, rgba(200, 150, 62, 0.08), transparent),
    radial-gradient(ellipse 60% 50% at 20% 80%, rgba(93, 140, 90, 0.06), transparent);
}
.login-panel {
  background: #FFFFFF;
  padding: 48px 44px 32px;
  border-radius: 16px;
  width: 400px;
  box-shadow:
    0 1px 2px rgba(44, 24, 16, 0.04),
    0 12px 40px rgba(44, 24, 16, 0.08);
  border: 1px solid #EDE6DA;
}
.brand { text-align: center; margin-bottom: 36px; }
.brand-seal {
  width: 56px; height: 56px; margin: 0 auto 16px;
  border-radius: 14px;
  background: #8B5E2B;
  color: #F5ECD7;
  font-size: 28px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Songti SC', 'STSong', 'SimSun', serif;
  box-shadow: 0 4px 14px rgba(139, 94, 43, 0.3);
}
.brand h1 {
  color: #2C1810; font-size: 24px; font-weight: 800;
  letter-spacing: 2px; margin-bottom: 6px;
  font-family: 'Songti SC', 'STSong', 'SimSun', serif;
}
.brand-sub { color: #8B7E74; font-size: 13px; letter-spacing: 1px; }
.foot {
  text-align: center; color: #BFB5A8; font-size: 12px;
  margin-top: 24px; letter-spacing: 1px;
}
</style>
