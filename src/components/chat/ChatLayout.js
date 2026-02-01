import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function ChatLayout({
  sidebar,
  header,
  children,
  isSidebarOpen,
  setIsSidebarOpen,
}) {
  return (
    <div className="chat-app">
      {/* Sidebar (desktop pinned, mobile overlay) */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        {sidebar}
      </div>

      {/* Mobile overlay to close sidebar */}
      <button
        type="button"
        className={`chat-sidebar-overlay ${isSidebarOpen ? 'is-open' : ''}`}
        aria-label="Close sidebar"
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-left">
            <button
              type="button"
              className="icon-btn chat-sidebar-toggle"
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              onClick={() => setIsSidebarOpen((v) => !v)}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-5 h-5" />
              ) : (
                <PanelLeftOpen className="w-5 h-5" />
              )}
            </button>
            {header}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}


