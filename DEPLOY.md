# 灵山AI导览 - 完整部署指南

## 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Python | 3.10+ | 后端服务 |
| Node.js | 18+ | 前端构建（如需开发） |
| Android SDK | 34+ | APK 构建/安装 |
| Android 手机 | Android 9+ | 运行 App |
| ADB | 最新 | 连接手机、端口转发 |

## 1. 启动后端

```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# （可选）配置 LLM API Key
# 编辑 .env 文件，设置 llm_api_key=你的API密钥

# 启动服务（默认端口 8000）
python run.py

# 验证
curl http://localhost:8000/
# 应返回：{"name":"景区AI数字人导览","status":"running"}
```

## 2. 安装 App 到手机

### 方式一：直接安装预构建 APK

```bash
# APK 在仓库中：mobile/android/app/build/outputs/apk/release/app-release.apk
adb install mobile/android/app/build/outputs/apk/release/app-release.apk
```

### 方式二：自己构建 APK

```bash
cd mobile

# 安装 JS 依赖
npm install

# 构建 Android APK
cd android
# Windows: 运行 build_apk.bat
# macOS/Linux: ./gradlew assembleRelease
```

构建完成后 APK 位于 `mobile/android/app/build/outputs/apk/release/app-release.apk`

## 3. 连接手机

```bash
# USB 连接手机，开启开发者选项和 USB 调试

# 确认设备已连接
adb devices

# 设置端口转发（将手机 localhost:8000 映射到电脑 8000）
adb reverse tcp:8000 tcp:8000

# 验证端口转发
adb reverse --list
# 应显示：tcp:8000 tcp:8000
```

## 4. 使用

1. 确保后端正在运行（`python run.py`）
2. 确保 ADB 端口转发已设置（`adb reverse tcp:8000 tcp:8000`）
3. 打开手机上的「AI 景区导览」App
4. 打字或按住语音按钮提问
5. 数字人会自动说话回答

## 5. 常见问题

**Q: App 显示"正在连接服务器"**
- 检查后端是否启动：`curl http://localhost:8000/`
- 检查 ADB 端口转发：`adb reverse --list`
- 重新设置转发：`adb reverse tcp:8000 tcp:8000`

**Q: 数字人不说话**
- 确认手机音量未静音
- 检查后端日志是否有 TTS 错误

**Q: 数字人张嘴但不出声**
- 检查 ADB 端口转发是否正常
- 手机音量是否开启

**Q: USB 断开后无法连接**
- 重新插拔 USB
- 重新运行 `adb reverse tcp:8000 tcp:8000`
