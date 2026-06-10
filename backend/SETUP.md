# 后端启动指南

## 环境要求

- Python 3.10+
- pip

## 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

## 2. 配置环境变量（可选）

复制 `.env` 文件并根据需要修改：

- `llm_api_key` — LLM API 密钥（DeepSeek 等）
- `llm_provider` — LLM 提供商：`deepseek` / `dashscope` / `openai` / `doubao`
- `llm_model` — 模型名称，默认 `deepseek-chat`

## 3. 启动服务

```bash
python run.py
```

服务运行在 `http://0.0.0.0:8000`，WebSocket 端点为 `ws://localhost:8000/ws`。

## 4. 验证

```bash
# HTTP 接口
curl http://localhost:8000/
# 应返回：{"name":"景区AI数字人导览","status":"running"}

# 静态文件
curl http://localhost:8000/digital-human/model-lite.html
```
