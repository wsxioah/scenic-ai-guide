<script setup>
import { ConfigProvider } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'

const theme = {
  token: {
    colorPrimary: '#8B5E2B',
    colorInfo: '#8B5E2B',
    colorSuccess: '#5D8C5A',
    colorWarning: '#D4A43A',
    colorError: '#B5453A',
    colorTextBase: '#2C1810',
    colorBgLayout: '#F5F2EC',
    borderRadius: 8,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif`,
  },
  components: {
    Layout: {
      siderBg: '#241A12',
      headerBg: '#FFFFFF',
    },
    Menu: {
      darkItemBg: '#241A12',
      darkItemSelectedBg: '#8B5E2B',
    },
  },
}
</script>

<template>
  <ConfigProvider :locale="zhCN" :theme="theme">
    <router-view />
  </ConfigProvider>
</template>
