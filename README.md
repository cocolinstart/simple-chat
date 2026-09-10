# Streamline Chat

一个使用 Next.js App Router、LangChain.js 和 Server-Sent Events 实现的 Token-by-Token Chat UI。

## 开始使用

```bash
nvm use 20
npm install
npm run dev
```

打开 http://localhost:3000。没有配置 API Key 时，界面会使用本地演示流验证 SSE 效果。

如需连接 OpenAI，在项目根目录创建 `.env.local`：

```env
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4o-mini
```

服务端接口是 `POST /api/chat`，请求体为 `{ "messages": [{ "role": "user", "content": "..." }] }`，响应为 `text/event-stream`。
