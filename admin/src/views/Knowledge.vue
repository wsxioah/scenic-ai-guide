<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import axios from 'axios'

const points = ref([])
const loading = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)

// Create form
const createVisible = ref(false)
const createForm = ref({ title: '', content: '', tags: '', scenic_id: null })

// Import
const importVisible = ref(false)
const importText = ref('')

const columns = [
  { title: 'ID', dataIndex: 'id', width: 70 },
  { title: '标题', dataIndex: 'title', width: 180 },
  { title: '内容', dataIndex: 'content', ellipsis: true },
  { title: '标签', dataIndex: 'tags', width: 120 },
  { title: '来源', dataIndex: 'source', width: 80 },
  { title: '操作', dataIndex: 'action', width: 80, align: 'center' },
]

async function fetchPoints() {
  loading.value = true
  try {
    const { data } = await axios.get('/api/knowledge/points')
    points.value = data
  } catch { message.error('知识列表加载失败') }
  loading.value = false
}

async function handleSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  try {
    const { data } = await axios.get('/api/knowledge/search', { params: { q: searchQuery.value, top_k: 5 } })
    searchResults.value = data.results || []
  } catch { message.error('知识检索失败') }
  searching.value = false
}

async function handleCreate() {
  try {
    await axios.post('/api/knowledge/points', createForm.value)
    createVisible.value = false
    createForm.value = { title: '', content: '', tags: '', scenic_id: null }
    await fetchPoints()
  } catch { message.error('知识条目创建失败') }
}

async function handleDelete(id) {
  try {
    await axios.delete(`/api/knowledge/points/${id}`)
    await fetchPoints()
  } catch { message.error('知识条目删除失败') }
}

async function handleBatchImport() {
  if (!importText.value.trim()) return
  const items = importText.value.split('\n').filter(Boolean).map(line => {
    const [title, content] = line.split('\t')
    return { title: title || '', content: content || '', tags: [] }
  })
  if (items.length === 0) return
  try {
    const { data } = await axios.post('/api/knowledge/import/batch', items)
    alert(data.message)
    importVisible.value = false
    importText.value = ''
    await fetchPoints()
  } catch (e) { message.error(e?.response?.data?.detail || '批量导入失败') }
}

async function handleExcelImport(info) {
  const file = info.file.originFileObj || info.file
  if (!file) return
  const form = new FormData()
  form.append('file', file)
  try {
    const { data } = await axios.post('/api/knowledge/import/excel', form)
    alert(data.message)
    await fetchPoints()
  } catch (e) { message.error(e?.response?.data?.detail || 'Excel导入失败') }
}

onMounted(fetchPoints)
</script>

<template>
  <div>
    <!-- Toolbar -->
    <a-space style="margin-bottom: 16px; flex-wrap: wrap">
      <a-input-search
        v-model:value="searchQuery"
        placeholder="搜索知识库..."
        style="width: 300px"
        @search="handleSearch"
      />
      <a-button type="primary" @click="createVisible = true">添加知识</a-button>
      <a-button @click="importVisible = true">批量导入</a-button>
      <a-upload
        :show-upload-list="false"
        accept=".xlsx,.xls"
        :custom-request="handleExcelImport"
      >
        <a-button>📊 Excel导入</a-button>
      </a-upload>
    </a-space>

    <!-- Search results -->
    <a-card v-if="searchResults.length > 0" title="检索结果" size="small" style="margin-bottom: 16px">
      <div v-for="r in searchResults" :key="r.title" style="padding: 8px 0; border-bottom: 1px solid #f0f0f0">
        <strong>{{ r.title }}</strong>
        <span style="color: #6b7280; margin-left: 8px">相关度: {{ (r.score * 100).toFixed(1) }}%</span>
        <p style="margin: 4px 0 0; color: #374151">{{ r.content?.slice(0, 200) }}</p>
      </div>
    </a-card>

    <!-- Knowledge table -->
    <a-card title="知识列表">
      <a-table
        :columns="columns"
        :data-source="points"
        :loading="loading"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 15 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'tags'">
            <a-tag v-for="t in (record.tags || '').split(',').filter(Boolean)" :key="t">{{ t }}</a-tag>
          </template>
          <template v-if="column.dataIndex === 'action'">
            <a-popconfirm title="确定删除？" @confirm="handleDelete(record.id)">
              <a-button type="link" danger size="small">删除</a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create modal -->
    <a-modal v-model:open="createVisible" title="添加知识" @ok="handleCreate" width="600px">
      <a-form :model="createForm" layout="vertical">
        <a-form-item label="标题" required>
          <a-input v-model:value="createForm.title" placeholder="知识标题" />
        </a-form-item>
        <a-form-item label="内容" required>
          <a-textarea v-model:value="createForm.content" :rows="6" placeholder="知识内容" />
        </a-form-item>
        <a-form-item label="标签">
          <a-input v-model:value="createForm.tags" placeholder="逗号分隔" />
        </a-form-item>
        <a-form-item label="关联景点ID">
          <a-input-number v-model:value="createForm.scenic_id" style="width: 100%" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Import modal -->
    <a-modal v-model:open="importVisible" title="批量导入" @ok="handleBatchImport" width="700px">
      <p style="color: #6b7280; margin-bottom: 12px">每行一条知识，格式：标题\t内容（Tab分隔）</p>
      <a-textarea v-model:value="importText" :rows="10" placeholder="灵山大佛建造历史&#9;灵山大佛于1994年...&#10;梵宫参观指南&#9;梵宫被誉为东方卢浮宫..." />
    </a-modal>
  </div>
</template>
