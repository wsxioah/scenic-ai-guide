<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const users = ref([])
const loading = ref(false)

const columns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  { title: '手机号', dataIndex: 'phone', width: 150 },
  { title: '昵称', dataIndex: 'nickname' },
  { title: '注册时间', dataIndex: 'created_at', width: 200 },
]

async function fetchUsers() {
  loading.value = true
  try {
    const { data } = await axios.get('/api/admin/users')
    users.value = data
  } catch { /* ignore */ }
  loading.value = false
}

onMounted(fetchUsers)
</script>

<template>
  <a-card title="用户列表">
    <a-table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      row-key="id"
      size="small"
      :pagination="{ pageSize: 20 }"
    />
  </a-card>
</template>
