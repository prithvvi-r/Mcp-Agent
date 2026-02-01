import React from 'react';
import { Bot } from 'lucide-react';
import MessageBubble from './MessageBubble';

export default function MessageList({
  messages,
  streamingMessage,
  toolStatus,
  messagesEndRef,
}) {
  const isEmpty = messages.length === 0 && !streamingMessage;

  return (
    <div className="chat-messages">
      {isEmpty ? (
        <div className="chat-empty chat-anim-fade-in">
          <div className="chat-empty-icon">
            <Bot className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="chat-empty-title">How can I help you?</div>
          <div className="chat-empty-sub">
            Ask anything — I can search, analyze, and use tools when needed.
          </div>
          <div className="chat-suggestions">
            <div className="chat-suggestion">“Summarize my notes.”</div>
            <div className="chat-suggestion">“Explain this error.”</div>
            <div className="chat-suggestion">“Create a study plan.”</div>
          </div>
        </div>
      ) : null}

      {messages.map((m, idx) => (
        <MessageBubble key={idx} role={m.role} content={m.content} />
      ))}

      {streamingMessage ? (
        <MessageBubble role="assistant" content={streamingMessage} isStreaming />
      ) : null}

      {toolStatus?.active ? (
        <div className="chat-tool chat-anim-fade-in">
          <div className="chat-tool-pill">
            <span
              className={`chat-tool-dot ${
                String(toolStatus.label || '').includes('finished')
                  ? 'is-done'
                  : 'is-active'
              }`}
            />
            <span className="chat-tool-text">{toolStatus.label}</span>
          </div>
        </div>
      ) : null}

      <div ref={messagesEndRef} />
    </div>
  );
}


