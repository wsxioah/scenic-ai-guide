<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const menuItems = [
  { key: 'dashboard', label: '仪表盘', icon: 'DashboardOutlined', path: '/dashboard' },
  { key: 'knowledge', label: '知识库管理', icon: 'BookOutlined', path: '/knowledge' },
  { key: 'users', label: '用户管理', icon: 'TeamOutlined', path: '/users' },
  { key: 'conversations', label: '对话统计', icon: 'MessageOutlined', path: '/conversations' },
  { key: 'digital-human', label: '数字人配置', icon: 'RobotOutlined', path: '/digital-human' },
  { key: 'announcements', label: '公告管理', icon: 'NotificationOutlined', path: '/announcements' },
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
        <span class="logo-text">🏔️ 景区AI管理</span>
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
        <a-tag color="green">景区AI数字人导览 v1.0</a-tag>
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
}
.logo-text {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
.layout-header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
}
.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}
.layout-content {
  padding: 24px;
  background: #f5f5f5;
  min-height: calc(100vh - 64px);
}
</style>
