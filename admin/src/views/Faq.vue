<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import axios from 'axios'

const faqs = ref([])
const loading = ref(false)
const modalVisible = ref(false)
const isEdit = ref(false)
const editingId = ref(null)

const form = ref({
  question: '', answer: '', category: 'general',
  sort_order: 0, is_published: true,
})

const categoryOptions = [
  { value: 'general', label: '一般' },
  { value: 'tickets', label: '票务' },
  { value: 'transport', label: '交通' },
  { value: 'facilities', label: '设施' },
]

const columns = [
  { title: 'ID', dataIndex: 'id', width: 60 },
  { title: '问题', dataIndex: 'question', ellipsis: true },
  { title: '分类', dataIndex: 'category', width: 80, customRender: ({ text }) => categoryOptions.find(c => c.value === text)?.label || text },
  { title: '排序', dataIndex: 'sort_order', width: 60, align: 'center' },
  { title: '状态', dataIndex: 'is_published', width: 80, align: 'center', customRender: ({ text }) => text ? '✅ 已发布' : '⏸ 隐藏' },
  { title: '操作', dataIndex: 'action', width: 160, align: 'center' },
]

async function fetchFaqs() {
  loading.value = true
  try {
    const { data } = await axios.get('/api/admin/faqs', { params: { page_size: 100 } })
    faqs.value = data.items
  } catch (e) {
    message.error('获取FAQ列表失败: ' + (e?.response?.data?.detail || e?.message || '未知错误'))
  }
  loading.value = false
}

function openCreate() {
  isEdit.value = false
  editingId.value = null
  form.value = { question: '', answer: '', category: 'general', sort_order: 0, is_published: true }
  modalVisible.value = true
}

function openEdit(record) {
  isEdit.value = true
  editingId.value = record.id
  form.value = {
    question: record.question,
    answer: record.answer,
    category: record.category || 'general',
    sort_order: record.sort_order || 0,
    is_published: record.is_published,
  }
  modalVisible.value = true
}

async function handleSave() {
  if (!form.value.question.trim() || !form.value.answer.trim()) {
    message.warning('问题和回答不能为空')
    return
  }
  try {
    if (isEdit.value) {
      await axios.put(`/api/admin/faqs/${editingId.value}`, null, { params: form.value })
      message.success('FAQ已更新')
    } else {
      await axios.post('/api/admin/faqs', null, { params: form.value })
      message.success('FAQ创建成功')
    }
    modalVisible.value = false
    fetchFaqs()
  } catch (e) {
    message.error('保存失败: ' + (e?.response?.data?.detail || e?.message || '未知错误'))
  }
}

async function handleDelete(id) {
  try {
    await axios.delete(`/api/admin/faqs/${id}`)
    message.success('FAQ已删除')
    fetchFaqs()
  } catch (e) {
    message.error('删除失败: ' + (e?.response?.data?.detail || e?.message || '未知错误'))
  }
}

onMounted(fetchFaqs)
</script>

<template>
  <div>
    <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center">
      <h2 style="margin: 0">FAQ 管理</h2>
      <a-button type="primary" @click="openCreate">+ 新增FAQ</a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="faqs"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm
              title="确定删除这条FAQ？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(record.id)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑FAQ' : '新增FAQ'"
      @ok="handleSave"
      width="640px"
    >
      <a-form layout="vertical">
        <a-form-item label="问题" required>
          <a-input v-model:value="form.question" placeholder="输入常见问题" />
        </a-form-item>
        <a-form-item label="回答" required>
          <a-textarea v-model:value="form.answer" :rows="6" placeholder="输入详细回答" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="分类">
              <a-select v-model:value="form.category" :options="categoryOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number v-model:value="form.sort_order" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="发布状态">
              <a-switch v-model:checked="form.is_published" checked-children="发布" un-checked-children="隐藏" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>
