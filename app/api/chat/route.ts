import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

const encoder = new TextEncoder();
const event = (payload: object) => encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

function toLangChainMessage(message: ChatMessage) {
  if (message.role === "user") return new HumanMessage(message.content);
  return new AIMessage(message.content);
}

async function* demoStream(messages: ChatMessage[]) {
  const question = messages.at(-1)?.content ?? "你的问题";
  const reply = `这是一个本地演示流。你刚刚问的是「${question}」。配置 GLM_API_KEY 后，这里会自动切换到 LangChain.js 驱动的模型流。`;
  for (const token of reply) {
    await new Promise((resolve) => setTimeout(resolve, 22));
    yield token;
  }
}

// 本项目使用 BigModel 的 GLM 模型进行测试，请配置自己的 GLM_API_KEY 进行调试
const GLM_API_KEY = 'glm-key';

export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: ChatMessage[] };
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const source = GLM_API_KEY
          ? await new ChatOpenAI({ 
            model: "glm-5.2",
            apiKey: GLM_API_KEY,
            useResponsesApi: false,
            configuration: {
              baseURL: "https://open.bigmodel.cn/api/paas/v4/",
            },
            temperature: 0.7, 
            streaming: true 
          }).stream([
              new SystemMessage("你是一个简洁、友好的中文技术助手。请用清晰的段落回答。"),
              ...messages.map(toLangChainMessage),
            ])
          : demoStream(messages);

        for await (const chunk of source) {
          const token = typeof chunk === "string" ? chunk : typeof chunk.content === "string" ? chunk.content : "";
          if (token) controller.enqueue(event({ token }));
        }
        controller.enqueue(event({ done: true }));
        controller.close();
      } catch (error) {
        controller.enqueue(event({ error: error instanceof Error ? error.message : "Stream failed" }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}