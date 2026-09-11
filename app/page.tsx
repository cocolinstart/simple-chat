"use client";

import { SubmitEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };

const starters = ["解释一下 SSE 是怎么工作的", "给我一个 LangChain.js 示例", "Next.js 的 Route Handler 有什么优势？"];

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>,
          code: ({ className, children, ...props }) => <code className={className ?? "inline-code"} {...props}>{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "你好，我是 Streamline。告诉我你正在构建什么，我会一边思考一边回答。" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSubmit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isStreaming) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!response.ok || !response.body) throw new Error("Unable to start stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as { token?: string; error?: string; };
          if (payload.error) throw new Error(payload.error);
          if (payload.token) {
            setMessages((current) => {
              const updated = [...current];
              updated[updated.length - 1] = { role: "assistant", content: updated[updated.length - 1].content + payload.token };
              return updated;
            });
          }
        }
        if (done) break;
      }
    } catch (error) {
      setMessages((current) => {
        const updated = [...current];
        updated[updated.length - 1] = { role: "assistant", content: `连接出现问题：${error instanceof Error ? error.message : "请稍后重试"}` };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <main className="chat-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">✦</span><span>streamline</span></div>
        <div className="status"><span className="status-dot" /> LangChain · SSE <span className="status-divider" /> <span className="muted">在线</span></div>
      </header>
      <section className="chat-stage">
        <h1>Ideas, in motion.</h1>
        <p className="intro">一个极简的流式对话实验室。每个字节抵达的瞬间，都在浏览器里变成可见的思考。</p>
        <div className="messages" aria-live="polite">
          {messages.map((message, index) => (
            <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
              <span className="message-label">{message.role === "assistant" ? "STREAMLINE" : "YOU"}</span>
              {message.role === "assistant" ? <MarkdownMessage content={message.content} /> : <p>{message.content}</p>}
              {isStreaming && index === messages.length - 1 && <span className="cursor" />}
            </article>
          ))}
        </div>
        <form className="composer" onSubmit={handleSubmit}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="写下一个问题..." rows={1} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSubmit(); } }} disabled={isStreaming} />
          <button type="submit" aria-label="发送消息" disabled={!input.trim() || isStreaming}>↑</button>
        </form>
        <div className="starter-list">
          {starters.map((starter) => <button key={starter} type="button" onClick={() => setInput(starter)}>{starter}<span>↗</span></button>)}
        </div>
      </section>
      <footer><span>POWERED BY NEXT.JS + LANGCHAIN</span><span>流式输出 · TOKEN BY TOKEN</span></footer>
    </main>
  );
}
