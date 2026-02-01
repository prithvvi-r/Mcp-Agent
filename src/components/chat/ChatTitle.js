import React from 'react';
import { Sparkles } from 'lucide-react';

export default function ChatTitle({ subtitle }) {
  return (
    <div className="chat-title">
      <div className="chat-title-row">
        <div className="chat-title-icon">
          <Sparkles className="w-4 h-4 text-indigo-300" />
        </div>
        <div className="chat-title-text">Chat</div>
      </div>
      {subtitle ? <div className="chat-title-sub">{subtitle}</div> : null}
    </div>
  );
}


