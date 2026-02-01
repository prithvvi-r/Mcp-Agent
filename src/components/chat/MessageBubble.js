import React from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

function RoleIcon({ role }) {
  if (role === 'user') return <User className="w-5 h-5 text-white" />;
  return <Bot className="w-5 h-5 text-white" />;
}

function Markdown({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          if (!inline && match) {
            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: 12,
                  background: 'rgba(2,6,23,0.65)',
                  border: '1px solid rgba(148,163,184,0.18)',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }
          return (
            <code className={`chat-inline-code ${className || ''}`} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function MessageBubble({ role, content, isStreaming }) {
  const isUser = role === 'user';
  return (
    <div className={`chat-row ${isUser ? 'is-user' : 'is-assistant'} chat-anim-slide-up`}>
      <div className="chat-row-inner">
        <div className={`chat-avatar ${isUser ? 'is-user' : 'is-assistant'}`}>
          <RoleIcon role={role} />
        </div>
        <div className={`chat-bubble ${isUser ? 'is-user' : 'is-assistant'}`}>
          <div className="chat-bubble-content">
            <Markdown content={content} />
            {isStreaming ? <span className="chat-caret" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}


