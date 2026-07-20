<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import axios from 'axios'
import * as echarts from 'echarts'

const stats = ref({ users: 0, scenic_spots: 0, knowledge_points: 0, conversations: 0, messages: 0, behavior_records: 0 })
const demographics = ref({ age_distribution: [], gender: { male: 0, female: 0 } })
const satisfaction = ref({ distribution: [], average: 0 })
const spending = ref({ breakdown: [], avg_total_cost: 0 })
const hotAttractions = ref([])
const typeStats = ref([])
const groupDist = ref([])
const trend = ref([])
const knowledgeSources = ref([])
const qaSatisfaction = ref({ positive: 0, negative: 0, rate: 0 })
const recentQueries = ref([])
const loading = ref(true)
const loadError = ref(false)

const charts = {}

function initChart(id, option) {
  const el = document.getElementById(id)
  if (!el) return
  if (charts[id]) charts[id].dispose()
  const chart = echarts.init(el)
  chart.setOption(option)
  charts[id] = chart
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/admin/dashboard/full')
    stats.value = data.stats
    demographics.value = data.tourist_demographics
    satisfaction.value = data.satisfaction
    spending.value = data.spending
    hotAttractions.value = data.hot_attractions
    typeStats.value = data.type_stats
    groupDist.value = data.group_distribution
    trend.value = data.conversation_trend
    knowledgeSources.value = data.knowledge_sources
    qaSatisfaction.value = data.qa_satisfaction
    recentQueries.value = data.recent_queries
  } catch {
    loadError.value = true
  }
  loading.value = false

  setTimeout(() => {
    // 1. Age distribution bar chart
    initChart('age-chart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 10, bottom: 30 },
      xAxis: { type: 'category', data: demographics.value.age_distribution.map(d => d.range) },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar', data: demographics.value.age_distribution.map(d => d.count),
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#6366F1' }, { offset: 1, color: '#A5B4FC' }
        ]) },
        barWidth: '50%',
      }],
    })

    // 2. Gender pie chart
    initChart('gender-chart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['50%', '70%'],
        data: [
          { value: demographics.value.gender.male, name: '男性', itemStyle: { color: '#3B82F6' } },
          { value: demographics.value.gender.female, name: '女性', itemStyle: { color: '#EC4899' } },
        ],
        label: { show: true, formatter: '{b}\n{d}%' },
      }],
    })

    // 3. Satisfaction distribution bar
    initChart('sat-chart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 10, bottom: 30 },
      xAxis: { type: 'category', data: satisfaction.value.distribution.map(d => d.rating + '分') },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar', data: satisfaction.value.distribution.map(d => d.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#F59E0B' }, { offset: 1, color: '#FCD34D' }
          ])
        },
        barWidth: '50%',
      }],
    })

    // 4. Spending breakdown pie
    initChart('cost-chart', {
      tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie', radius: ['40%', '65%'],
        data: spending.value.breakdown.map(c => ({
          value: Math.round(c.avg), name: c.category,
        })),
        label: { formatter: '{b}\n¥{c}' },
      }],
    })

    // 5. Type distribution horizontal bar
    initChart('type-chart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 100, right: 60, top: 10, bottom: 20 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: { type: 'category', data: typeStats.value.map(t => t.type).reverse(), inverse: true },
      series: [{
        type: 'bar', data: typeStats.value.map(t => t.count).reverse(),
        itemStyle: { color: '#10B981' },
        barWidth: '60%',
        label: { show: true, position: 'right', fontSize: 11 },
      }],
    })

    // 6. 30-day conversation trend
    initChart('trend-chart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 10, bottom: 30 },
      xAxis: { type: 'category', data: trend.value.map(t => t.date), axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        name: '对话数', type: 'line',
        data: trend.value.map(t => t.count),
        smooth: true, symbol: 'none',
        areaStyle: { color: 'rgba(99, 102, 241, 0.1)' },
        lineStyle: { color: '#6366F1', width: 2 },
      }],
    })

    // 7. Knowledge sources donut
    initChart('knowledge-chart', {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie', radius: ['55%', '80%'],
        data: knowledgeSources.value.map(s => ({ value: s.count, name: s.source })),
        label: { formatter: '{b}\n{d}%' },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
      }],
    })

    // 8. Group size distribution
    initChart('group-chart', {
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 10, bottom: 30 },
      xAxis: { type: 'category', data: groupDist.value.map(d => d.size + '人'), axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar', data: groupDist.value.map(d => d.count),
        itemStyle: { color: '#8B5CF6' },
        barWidth: '50%',
      }],
    })

    window.addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()))
  }, 150)
})

onUnmounted(() => {
  Object.values(charts).forEach(c => c.dispose())
})
</script>

<template>
  <a-spin :spinning="loading" size="large">
    <a-alert
      v-if="loadError"
      message="数据加载失败"
      description="统计数据未能加载，请检查网络连接后刷新页面重试。"
      type="warning"
      show-icon
      closable
      style="margin-bottom: 16px"
      @close="loadError = false"
    />
    <!-- Stats cards -->
    <a-row :gutter="[16, 16]" style="margin-bottom: 20px">
      <a-col :span="4" v-for="(val, key) in stats" :key="key">
        <a-card size="small" hoverable style="text-align: center">
          <a-statistic
            :title="{
              users: '用户数', scenic_spots: '景点', knowledge_points: '知识库',
              conversations: '对话', messages: '消息', behavior_records: '行为数据',
            }[key]"
            :value="val"
            :value-style="{
              fontSize: '24px',
              color: { users: '#3B82F6', scenic_spots: '#10B981', knowledge_points: '#F59E0B', conversations: '#6366F1', messages: '#EC4899', behavior_records: '#8B5CF6' }[key],
            }"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- Row: Age + Gender -->
    <a-row :gutter="[16, 16]" style="margin-bottom: 20px">
      <a-col :span="14">
        <a-card title="游客年龄分布" size="small">
          <div id="age-chart" style="height: 280px"></div>
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card title="游客性别比例" size="small">
          <div id="gender-chart" style="height: 280px"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Row: Satisfaction + Spending -->
    <a-row :gutter="[16, 16]" style="margin-bottom: 20px">
      <a-col :span="12">
        <a-card size="small">
          <template #title>
            满意度分布
            <a-tag color="orange" style="margin-left: 8px">均分 {{ satisfaction.average }}</a-tag>
          </template>
          <div id="sat-chart" style="height: 250px"></div>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card size="small">
          <template #title>
            人均消费构成
            <a-tag color="blue" style="margin-left: 8px">人均 ¥{{ spending.avg_total_cost }}</a-tag>
          </template>
          <div id="cost-chart" style="height: 250px"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Row: Hot attractions table + Type distribution -->
    <a-row :gutter="[16, 16]" style="margin-bottom: 20px">
      <a-col :span="14">
        <a-card :title="`热门景点 TOP10（基于 ${stats.behavior_records.toLocaleString()} 条行为数据）`" size="small">
          <a-table
            :columns="[
              { title: '#', dataIndex: 'rank', width: 45 },
              { title: '景点名称', dataIndex: 'name', ellipsis: true },
              { title: '访问量', dataIndex: 'visit_count', width: 80, align: 'right' },
              { title: '均分', dataIndex: 'avg_satisfaction', width: 60, align: 'right' },
              { title: '人均', dataIndex: 'avg_cost', width: 80, align: 'right', customRender: ({ text }) => '¥' + text },
              { title: '均时', dataIndex: 'avg_stay_min', width: 70, align: 'right', customRender: ({ text }) => text + '分' },
            ]"
            :data-source="hotAttractions.map((s, i) => ({ ...s, rank: i + 1, avg_cost: Math.round(s.avg_cost), avg_stay_min: Math.round(s.avg_stay_min) }))"
            :pagination="false"
            size="small"
            row-key="rank"
            :scroll="{ y: 340 }"
          />
        </a-card>
      </a-col>
      <a-col :span="10">
        <a-card title="景区类型热度" size="small">
          <div id="type-chart" style="height: 370px"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Row: Conversation trend -->
    <a-row :gutter="[16, 16]" style="margin-bottom: 20px">
      <a-col :span="24">
        <a-card title="近30天对话趋势" size="small">
          <div id="trend-chart" style="height: 250px"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Row: Knowledge sources + Group distribution + QA -->
    <a-row :gutter="[16, 16]" style="margin-bottom: 20px">
      <a-col :span="8">
        <a-card title="知识库来源" size="small">
          <div id="knowledge-chart" style="height: 240px"></div>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="团体规模分布" size="small">
          <div id="group-chart" style="height: 240px"></div>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card title="问答满意度" size="small">
          <a-row :gutter="[0, 12]">
            <a-col :span="8" style="text-align: center">
              <a-statistic title="满意" :value="qaSatisfaction.positive" value-style="color: #10B981;font-size:22px" />
            </a-col>
            <a-col :span="8" style="text-align: center">
              <a-statistic title="不满意" :value="qaSatisfaction.negative" value-style="color: #EF4444;font-size:22px" />
            </a-col>
            <a-col :span="8" style="text-align: center">
              <a-statistic title="好评率" :value="qaSatisfaction.rate" suffix="%" value-style="color: #3B82F6;font-size:22px" />
            </a-col>
          </a-row>
          <a-divider style="margin: 12px 0" />
          <div style="font-size: 12px; color: #6B7280; max-height: 180px; overflow-y: auto">
            <div v-for="(q, i) in recentQueries.slice(0, 8)" :key="i" style="padding: 4px 0; border-bottom: 1px solid #f0f0f0">
              {{ q }}
            </div>
            <div v-if="recentQueries.length === 0" style="text-align: center; padding: 20px; color: #ccc">
              暂无数据
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </a-spin>
</template>
