import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import axios from 'axios'
import App from './App.vue'
import router from './router'

axios.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token')
      router.push('/login')
    }
    return Promise.reject(err)
  },
)

const app = createApp(App)
app.use(Antd)
app.use(router)
app.mount('#app')
