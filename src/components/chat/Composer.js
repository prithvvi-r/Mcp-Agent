import React from 'react';
import { Loader2, Send, Terminal, XCircle } from 'lucide-react';

export default function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  onClear,
}) {
  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="chat-composer">
      <form onSubmit={onSubmit} className="chat-composer-form">
        <div className={`chat-composer-glow ${disabled ? 'is-off' : ''}`} />
        <div className="chat-composer-inner">
          <div className="chat-composer-icon" aria-hidden="true">
            <Terminal className="w-5 h-5" />
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Send a message…"
            disabled={disabled}
            className="chat-composer-input"
          />

          {value.trim().length > 0 && !disabled ? (
            <button
              type="button"
              className="icon-btn"
              aria-label="Clear input"
              onClick={onClear}
              title="Clear"
            >
              <XCircle className="w-5 h-5" />
            </button>
          ) : null}

          <button
            type="submit"
            disabled={!canSend}
            className={`chat-send-btn ${canSend ? 'is-ready' : ''}`}
            aria-label="Send message"
          >
            {disabled ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="chat-disclaimer">
          AI can make mistakes. Verify important information.
        </div>
      </form>
    </div>
  );
}


