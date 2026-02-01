import React, { useMemo } from 'react';
import { Bot, MessageSquare, PlusCircle, Search } from 'lucide-react';

function getThreadLabel(threadId) {
  if (!threadId) return 'Thread';
  return `Thread ${String(threadId).slice(0, 6)}…`;
}

export default function Sidebar({
  activeThreadId,
  threads,
  onNewChat,
  onSelectThread,
  searchValue,
  onSearchChange,
}) {
  const filtered = useMemo(() => {
    const q = (searchValue || '').trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => String(t).toLowerCase().includes(q));
  }, [threads, searchValue]);

  return (
    <aside className="chat-sidebar-inner">
      <div className="chat-sidebar-top">
        <div className="chat-brand">
          <div className="chat-brand-icon">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="chat-brand-title">AI Assistant</div>
            <div className="chat-brand-subtitle">LangGraph Powered</div>
          </div>
        </div>

        <button type="button" onClick={onNewChat} className="primary-btn w-full">
          <PlusCircle className="w-4 h-4" />
          <span>New chat</span>
        </button>

        <label className="chat-search" aria-label="Search threads">
          <Search className="w-4 h-4" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search threads…"
            className="chat-search-input"
          />
        </label>
      </div>

      <div className="chat-sidebar-section">
        <div className="chat-sidebar-section-title">Recent chats</div>

        <div className="chat-thread-list">
          {filtered
            .slice()
            .reverse()
            .map((thread) => {
              const isActive = thread === activeThreadId;
              return (
                <button
                  key={thread}
                  type="button"
                  onClick={() => onSelectThread(thread)}
                  className={`chat-thread-item ${isActive ? 'is-active' : ''}`}
                >
                  <MessageSquare
                    className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'
                      }`}
                  />
                  <span className="chat-thread-label">
                    {isActive ? 'Active conversation' : getThreadLabel(thread)}
                  </span>
                </button>
              );
            })}

          {filtered.length === 0 && (
            <div className="chat-thread-empty">No threads match your search.</div>
          )}
        </div>
      </div>

      <div className="chat-sidebar-footer">
        <div className="chat-usercard">
          <div className="chat-user-avatar" aria-hidden="true" />
          <div className="min-w-0">
            <div className="chat-user-name">User</div>
            <div className="chat-user-meta">Local session</div>
          </div>
        </div>
      </div>
    </aside>
  );
}


