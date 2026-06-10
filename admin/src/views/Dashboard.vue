<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import * as echarts from 'echarts'

const stats = ref({ users: 0, scenic_spots: 0, knowledge_points: 0, conversations: 0, messages: 0 })
const hotSpots = ref([])
const trend = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/admin/dashboard')
    stats.value = data.stats
    hotSpots.value = data.hot_spots
    trend.value = data.conversation_trend
  } catch { /* ignore */ }
  loading.value = false

  // Render chart
  setTimeout(() => {
    const el = document.getElementById('trend-chart')
    if (!el) return
    const chart = echarts.init(el)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: trend.value.map(t => t.date) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        name: '对话数', type: 'line',
        data: trend.value.map(t => t.count),
        smooth: true,
        areaStyle: { color: 'rgba(37, 99, 235, 0.1)' },
        lineStyle: { color: '#2563EB' },
        itemStyle: { color: '#2563EB' },
      }],
    })
    window.addEventListener('resize', () => chart.resize())
  }, 100)
})
</script>

<template>
  <a-spin :spinning="loading">
    <!-- Stats cards -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="8" v-for="(val, key) in stats" :key="key">
        <a-card hoverable>
          <a-statistic
            :title="{
              users: '用户数', scenic_spots: '景点数',
              knowledge_points: '知识库', conversations: '对话数', messages: '消息数',
            }[key]"
            :value="val"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <!-- Trend chart -->
      <a-col :span="14">
        <a-card title="近7天对话趋势">
          <div id="trend-chart" style="height: 300px"></div>
        </a-card>
      </a-col>

      <!-- Hot spots -->
      <a-col :span="10">
        <a-card title="热门景点 TOP5">
          <a-table
            :columns="[
              { title: '排名', dataIndex: 'rank', width: 60 },
              { title: '景点', dataIndex: 'name' },
              { title: '浏览量', dataIndex: 'pv', width: 80 },
              { title: '评分', dataIndex: 'score', width: 80 },
            ]"
            :data-source="hotSpots.map((s, i) => ({ ...s, rank: i + 1 }))"
            :pagination="false"
            size="small"
            row-key="rank"
          />
        </a-card>
      </a-col>
    </a-row>
  </a-spin>
</template>
