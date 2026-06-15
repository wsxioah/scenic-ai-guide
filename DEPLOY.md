# 灵山AI导览 - 部署指南

## 环境要求

- Python 3.10+
- Android 手机 (Android 9+)
- 电脑和手机连接同一 WiFi/热点

## 1. 启动后端

```bash
cd backend
pip install -r requirements.txt

# （可选）配置 LLM API Key
# 编辑 .env，设置 llm_api_key=你的API密钥

python run.py
# 服务运行在 http://0.0.0.0:8000
```

验证：浏览器打开 `http://localhost:8000/`，应返回 JSON。

## 2. 配置 App 连接地址

编辑 `mobile/src/config.ts`，将 `SERVER_HOST` 改为你电脑的局域网 IP：

```ts
export const SERVER_HOST = '192.168.1.100';  // 改成你的 IP
export const SERVER_PORT = 8000;
```

查看电脑 IP：终端运行 `ipconfig`，找 `IPv4 地址`。

## 3. 构建并安装 App

```bash
cd mobile
npm install
npx expo run:android --variant release
```

或手动安装已构建的 APK：
```bash
adb install mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 4. 常见问题

**Q: App 显示"正在连接服务器"**
- 确认手机和电脑同一 WiFi
- 确认 `config.ts` 中 IP 正确
- 确认后端已启动：`curl http://localhost:8000/`
- Windows 需放行防火墙端口 8000

**Q: 数字人不说话**
- 检查手机音量
- 检查后端日志是否有 TTS/LLM 错误

**Q: AI 不回复**
- 检查 `.env` 中是否配置了 `llm_api_key`
