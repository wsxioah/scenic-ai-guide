import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { title: '登录' } },
  {
    path: '/', component: () => import('../layouts/MainLayout.vue'),
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '仪表盘' } },
      { path: 'knowledge', name: 'Knowledge', component: () => import('../views/Knowledge.vue'), meta: { title: '知识库管理' } },
      { path: 'users', name: 'Users', component: () => import('../views/Users.vue'), meta: { title: '用户管理' } },
      { path: 'conversations', name: 'Conversations', component: () => import('../views/Conversations.vue'), meta: { title: '对话统计' } },
      { path: 'digital-human', name: 'DigitalHuman', component: () => import('../views/DigitalHuman.vue'), meta: { title: '数字人配置' } },
      { path: 'announcements', name: 'Announcements', component: () => import('../views/Announcements.vue'), meta: { title: '公告管理' } },
      { path: 'faqs', name: 'Faqs', component: () => import('../views/Faq.vue'), meta: { title: 'FAQ管理' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token')
  if (to.path !== '/login' && !token) return '/login'
  if (to.path === '/login' && token) return '/dashboard'
})

export default router
