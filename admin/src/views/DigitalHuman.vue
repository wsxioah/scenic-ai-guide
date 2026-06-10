<script setup>
import { ref } from 'vue'

const config = ref({
  modelType: 'vrm',
  voiceType: 'zh-CN-XiaoxiaoNeural',
  greeting: '您好！我是灵山胜境AI导览助手。我可以为您介绍景点、推荐路线、解答关于佛教文化的问题。请问有什么可以帮您的？',
  speed: 1.0,
  pitch: 1.0,
})

const modelOptions = [
  { value: 'vrm', label: 'VRM 3D数字人' },
  { value: 'live2d', label: 'Live2D 2D数字人' },
]

const voiceOptions = [
  { value: 'zh-CN-XiaoxiaoNeural', label: '晓晓 (女声)' },
  { value: 'zh-CN-YunxiNeural', label: '云希 (男声)' },
  { value: 'zh-CN-XiaoyiNeural', label: '晓伊 (女声)' },
  { value: 'zh-CN-YunyangNeural', label: '云扬 (男声)' },
]

function handleSave() {
  alert('配置已保存！\n\n（实际部署时连接后端API）')
}
</script>

<template>
  <a-row :gutter="24">
    <a-col :span="14">
      <a-card title="数字人形象配置">
        <a-form layout="vertical">
          <a-form-item label="数字人类型">
            <a-select v-model:value="config.modelType" :options="modelOptions" />
          </a-form-item>
          <a-form-item label="TTS语音">
            <a-select v-model:value="config.voiceType" :options="voiceOptions" />
          </a-form-item>
          <a-form-item label="语速">
            <a-slider v-model:value="config.speed" :min="0.5" :max="2.0" :step="0.1" />
          </a-form-item>
          <a-form-item label="音调">
            <a-slider v-model:value="config.pitch" :min="0.5" :max="2.0" :step="0.1" />
          </a-form-item>
          <a-form-item label="欢迎语">
            <a-textarea v-model:value="config.greeting" :rows="3" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="handleSave">保存配置</a-button>
          </a-form-item>
        </a-form>
      </a-card>
    </a-col>

    <a-col :span="10">
      <a-card title="预览">
        <div class="preview-box">
          <div class="preview-avatar">🤖</div>
          <p class="preview-text">{{ config.greeting }}</p>
        </div>
        <a-divider />
        <a-descriptions :column="1" size="small" title="当前配置">
          <a-descriptions-item label="数字人">{{ config.modelType === 'vrm' ? 'VRM 3D' : 'Live2D 2D' }}</a-descriptions-item>
          <a-descriptions-item label="语音">{{ voiceOptions.find(v => v.value === config.voiceType)?.label }}</a-descriptions-item>
          <a-descriptions-item label="语速">{{ config.speed }}x</a-descriptions-item>
          <a-descriptions-item label="音调">{{ config.pitch }}x</a-descriptions-item>
        </a-descriptions>
      </a-card>
    </a-col>
  </a-row>
</template>

<style scoped>
.preview-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}
.preview-avatar {
  font-size: 64px;
  margin-bottom: 12px;
}
.preview-text {
  color: #fff;
  font-size: 14px;
  line-height: 1.6;
}
</style>
