<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  DashboardOutlined, BookOutlined, TeamOutlined,
  MessageOutlined, RobotOutlined, NotificationOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()

const userName = ref('')
try {
  const u = JSON.parse(localStorage.getItem('admin_user') || '{}')
  userName.value = u.phone || '管理员'
} catch { userName.value = '管理员' }

function logout() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  router.replace('/login')
}

const menuItems = [
  { key: 'dashboard', label: '仪表盘', icon: DashboardOutlined, path: '/dashboard' },
  { key: 'knowledge', label: '知识库管理', icon: BookOutlined, path: '/knowledge' },
  { key: 'users', label: '用户管理', icon: TeamOutlined, path: '/users' },
  { key: 'conversations', label: '对话统计', icon: MessageOutlined, path: '/conversations' },
  { key: 'digital-human', label: '数字人配置', icon: RobotOutlined, path: '/digital-human' },
  { key: 'announcements', label: '公告管理', icon: NotificationOutlined, path: '/announcements' },
  { key: 'faqs', label: 'FAQ管理', icon: QuestionCircleOutlined, path: '/faqs' },
]

const selectedKeys = ref([route.path.split('/')[1] || 'dashboard'])

watch(() => route.path, (path) => {
  selectedKeys.value = [path.split('/')[1] || 'dashboard']
})

function onMenuClick({ key }) {
  const item = menuItems.find(m => m.key === key)
  if (item) router.push(item.path)
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider collapsible breakpoint="lg" theme="dark">
      <div class="logo">
        <div class="logo-seal">禅</div>
        <span class="logo-text">灵山胜境</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
        mode="inline"
        @click="onMenuClick"
      >
        <a-menu-item v-for="item in menuItems" :key="item.key">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="layout-header">
        <span class="header-title">{{ route.meta?.title || '管理后台' }}</span>
        <div style="display:flex;align-items:center;gap:12px">
          <a-tag color="gold">AI数字人导览 v1.0</a-tag>
          <span style="color:#8B7E74;font-size:13px">{{ userName }}</span>
          <a-button type="link" size="small" @click="logout">退出</a-button>
        </div>
      </a-layout-header>
      <a-layout-content class="layout-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.logo-seal {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #8B5E2B;
  color: #F5ECD7;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Songti SC', 'STSong', 'SimSun', serif;
  flex-shrink: 0;
}
.logo-text {
  color: #F5ECD7;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  font-family: 'Songti SC', 'STSong', 'SimSun', serif;
  white-space: nowrap;
  overflow: hidden;
}
.layout-header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #EDE6DA;
}
.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #2C1810;
}
.layout-content {
  padding: 24px;
  background: #F5F2EC;
  min-height: calc(100vh - 64px);
}
</style>
