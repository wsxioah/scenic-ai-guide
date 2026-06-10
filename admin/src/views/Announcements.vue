<script setup>
import { ref } from 'vue'
import axios from 'axios'

const createForm = ref({ title: '', content: '', type: 'normal' })
const loading = ref(false)

async function handleCreate() {
  if (!createForm.value.title.trim() || !createForm.value.content.trim()) return
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('title', createForm.value.title)
    params.set('content', createForm.value.content)
    params.set('type', createForm.value.type)
    await axios.post('/api/admin/announcements', params)
    alert('公告发布成功！')
    createForm.value = { title: '', content: '', type: 'normal' }
  } catch { /* ignore */ }
  loading.value = false
}
</script>

<template>
  <a-row :gutter="24">
    <a-col :span="16">
      <a-card title="发布公告">
        <a-form :model="createForm" layout="vertical">
          <a-form-item label="公告标题" required>
            <a-input v-model:value="createForm.title" placeholder="请输入公告标题" />
          </a-form-item>
          <a-form-item label="公告类型">
            <a-radio-group v-model:value="createForm.type">
              <a-radio-button value="normal">普通</a-radio-button>
              <a-radio-button value="emergency">紧急</a-radio-button>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="公告内容" required>
            <a-textarea
              v-model:value="createForm.content"
              :rows="8"
              placeholder="请输入公告内容"
            />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" :loading="loading" @click="handleCreate">
              发布公告
            </a-button>
          </a-form-item>
        </a-form>
      </a-card>
    </a-col>

    <a-col :span="8">
      <a-card title="公告类型说明">
        <a-alert message="普通公告" description="日常景区通知、活动预告等一般信息" type="info" style="margin-bottom: 12px" />
        <a-alert message="紧急公告" description="天气预警、临时闭园等紧急通知，将通过推送实时告知游客" type="error" show-icon />
      </a-card>
    </a-col>
  </a-row>
</template>
