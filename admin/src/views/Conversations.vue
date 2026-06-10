<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const stats = ref({ recent_queries: [], satisfaction: { positive: 0, negative: 0, rate: 0 } })
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/admin/conversations/stats')
    stats.value = data
  } catch { /* ignore */ }
  loading.value = false
})
</script>

<template>
  <a-spin :spinning="loading">
    <!-- Satisfaction -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="8">
        <a-card>
          <a-statistic title="好评数" :value="stats.satisfaction.positive" :value-style="{ color: '#22C55E' }">
            <template #prefix>👍</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card>
          <a-statistic title="差评数" :value="stats.satisfaction.negative" :value-style="{ color: '#EF4444' }">
            <template #prefix>👎</template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card>
          <a-statistic title="满意度" :value="stats.satisfaction.rate" suffix="%" :value-style="{ color: '#2563EB' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- Recent queries -->
    <a-card title="最近用户提问">
      <a-list
        :data-source="stats.recent_queries"
        :pagination="{ pageSize: 15 }"
        size="small"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <span style="color: #374151">{{ item }}</span>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </a-spin>
</template>
