import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import {
    MessageSquare,
    Plus,
    Send,
    Bot,
    User,
    Loader2,
    PanelLeftClose,
    PanelLeftOpen,
    Menu,
    ChevronDown,
    Paperclip,
    Globe,
    ExternalLink,
    Trash2,
    MoreHorizontal
} from 'lucide-react';

const ChatApp = () => {
    // =========================== State ===========================
    const [threadId, setThreadId] = useState(uuidv4());
    const [chatThreads, setChatThreads] = useState([]);
    const [messageHistory, setMessageHistory] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [toolStatus, setToolStatus] = useState({ active: false, label: '' });
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // =========================== Utilities ===========================
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messageHistory, streamingMessage]);

    useEffect(() => {
        const loadThreads = async () => {
            try {
                const response = await fetch('http://localhost:8000/threads');
                if (response.ok) {
                    const data = await response.json();
                    const threads = data.threads || [];
                    setChatThreads(threads);
                }
            } catch (error) {
                console.error('Error loading threads:', error);
            }
        };
        loadThreads();
    }, [threadId]);

    const deleteChat = async (idToDelete) => {
        if (!window.confirm('Are you sure you want to delete this conversation?')) return;

        try {
            const response = await fetch(`http://localhost:8000/thread/${idToDelete}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setChatThreads(prev => prev.filter(t => t.id !== idToDelete));
                if (threadId === idToDelete) {
                    resetChat();
                }
            }
        } catch (error) {
            console.error('Error deleting thread:', error);
        }
    };

    const resetChat = () => {
        const newThreadId = uuidv4();
        setThreadId(newThreadId);
        setMessageHistory([]);
        setStreamingMessage('');
    };

    const loadConversation = async (selectedThreadId) => {
        try {
            const response = await fetch(`http://localhost:8000/thread/${selectedThreadId}/history`);
            if (response.ok) {
                const data = await response.json();
                setThreadId(selectedThreadId);
                setMessageHistory(data.messages || []);
                setStreamingMessage('');
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userInput.trim() || isStreaming) return;

        const currentInput = userInput.trim();
        setUserInput('');

        setMessageHistory(prev => [...prev, { role: 'user', content: currentInput }]);
        setIsStreaming(true);
        setStreamingMessage('');
        setToolStatus({ active: false, label: '' });

        try {
            const response = await fetch('http://localhost:8000/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: currentInput, thread_id: threadId })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullMessage = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'content') {
                                fullMessage += data.content;
                                setStreamingMessage(fullMessage);
                            } else if (data.type === 'tool_start') {
                                setToolStatus({ active: true, label: `Searching for ${data.tool}...` });
                            } else if (data.type === 'error') {
                                console.error('Stream error:', data.content);
                            }
                        } catch (e) { }
                    }
                }
            }

            if (fullMessage) {
                setMessageHistory(prev => [...prev, { role: 'assistant', content: fullMessage }]);
                setStreamingMessage('');
            }
            setToolStatus({ active: false, label: '' });
        } catch (error) {
            console.error('Streaming error:', error);
            setIsStreaming(false);
        } finally {
            setIsStreaming(false);
        }
    };

    const MarkdownRenderer = ({ content }) => {
        if (!content || typeof content !== 'string') {
            return <div className="text-gray-500 italic">No content or invalid data</div>;
        }

        return (
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <div className="relative group my-4">
                                <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] rounded-t-lg border-b border-white/10">
                                    <span className="text-xs font-sans text-gray-400 uppercase tracking-wider">{match[1]}</span>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(String(children))}
                                        className="text-xs text-gray-400 hover:text-white transition"
                                    >
                                        Copy code
                                    </button>
                                </div>
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    className="!mt-0 !rounded-t-none !rounded-b-lg scrollbar-thin"
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            </div>
                        ) : (
                            <code className={`${className} bg-[#3d3d3d] px-1 rounded text-sm`} {...props}>
                                {children}
                            </code>
                        );
                    }
                }}
                className="prose prose-invert max-w-none"
            >
                {content}
            </ReactMarkdown>
        );
    };

    return (
        <div className="flex h-screen bg-[#212121] text-[#ececec] overflow-hidden">
            {/* Sidebar Toggle Button (Mobile) */}
            <div className="lg:hidden absolute top-4 left-4 z-50">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#3d3d3d] rounded-lg">
                    <Menu className="w-5 h-5" />
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`fixed lg:relative z-40 h-full bg-[#171717] transition-all duration-300 ease-in-out border-r border-white/5 ${sidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden lg:w-0 border-none'
                }`}>
                <div className="flex flex-col h-full p-3 min-w-[260px]">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <button
                            onClick={resetChat}
                            className="flex items-center gap-3 px-3 py-3 w-full hover:bg-[#2d2d2d] rounded-xl transition group"
                        >
                            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black">
                                <Bot className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium">New Chat</span>
                            <Plus className="w-4 h-4 ml-auto text-gray-500 group-hover:text-white" />
                        </button>

                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="hidden lg:flex p-2 hover:bg-[#2d2d2d] rounded-lg transition ml-2"
                        >
                            <PanelLeftClose className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto mt-2 space-y-1">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase px-3 mb-2 tracking-widest leading-loose">Previous Chats</h3>
                        {[...chatThreads].reverse().map((thread) => (
                            <div key={thread.id} className="group relative flex items-center px-1">
                                <button
                                    onClick={() => loadConversation(thread.id)}
                                    className={`flex-1 flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left truncate ${thread.id === threadId ? 'bg-[#212121] text-white' : 'hover:bg-[#2d2d2d] text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{thread.title}</span>
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteChat(thread.id); }}
                                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[#3d3d3d] rounded-md text-gray-500 hover:text-red-400 transition-all active:scale-90"
                                    title="Delete chat"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5 px-2 pb-2">
                        <button className="flex items-center gap-3 px-3 py-3 w-full hover:bg-[#2d2d2d] rounded-xl transition text-left">
                            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">P</div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-semibold truncate">Pruthviraj</p>
                                <p className="text-[10px] text-gray-500">Free Plan</p>
                            </div>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative h-full">
                {/* Header */}
                <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#212121]/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-[#3d3d3d] rounded-lg transition">
                                <PanelLeftOpen className="w-5 h-5 text-gray-400" />
                            </button>
                        )}
                        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#3d3d3d] rounded-xl transition text-sm font-semibold">
                            <span>ChatGPT</span>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-[#3d3d3d] rounded-xl transition">
                            <ExternalLink className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </header>

                {/* Chat Container */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
                        {messageHistory.length === 0 && !streamingMessage ? (
                            <div className="h-[60vh] flex flex-col items-center justify-center opacity-0 animate-in">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black mb-6 shadow-xl">
                                    <Bot className="w-6 h-6 " />
                                </div>
                                <h2 className="text-2xl font-bold mb-8">How can I help you today?</h2>
                                <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                                    {["Help me code a Python script", "Brainstorm names for my startup", "Explain quantum computing simply", "Write a thank you email"].map((text) => (
                                        <button key={text} className="p-4 bg-[#2d2d2d] border border-white/5 rounded-2xl hover:bg-[#3d3d3d] transition text-left text-sm text-gray-300">
                                            {text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                {messageHistory.map((msg, i) => (
                                    <div key={i} className={`flex gap-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in`}>
                                        <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${msg.role === 'user' ? 'bg-[#3d3d3d]' : 'bg-emerald-600'
                                                }`}>
                                                {msg.role === 'user' ? 'P' : <Bot className="w-4 h-4" />}
                                            </div>
                                            <div className={`mt-0.5 ${msg.role === 'user' ? 'px-4 py-2 bg-[#2f2f2f] rounded-2xl' : ''}`}>
                                                <MarkdownRenderer content={msg.content} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {streamingMessage && (
                                    <div className="flex gap-4 animate-in">
                                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                        <div className="mt-0.5 flex-1">
                                            <MarkdownRenderer content={streamingMessage} />
                                            <span className="inline-block w-2 h-5 bg-[#ececec] animate-pulse ml-1 align-middle opacity-50"></span>
                                        </div>
                                    </div>
                                )}
                                {toolStatus.active && (
                                    <div className="flex items-center gap-3 text-xs text-gray-500 animate-in pl-12 italic">
                                        <Globe className="w-3 h-3 animate-pulse" />
                                        {toolStatus.label}
                                    </div>
                                )}
                            </>
                        )}
                        <div ref={messagesEndRef} className="h-40" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="max-w-3xl mx-auto w-full px-4 mb-4">
                    <div className="relative bottom-4">
                        <form onSubmit={handleSubmit} className="relative bg-[#2f2f2f] rounded-[26px] p-2 pr-3 shadow-2xl focus-within:ring-1 focus-within:ring-white/20 transition-all border border-white/5">
                            <div className="flex items-end gap-2 px-2 py-1">
                                <button type="button" className="p-2 hover:bg-[#3d3d3d] rounded-full transition mb-0.5">
                                    <Paperclip className="w-5 h-5 text-gray-400" />
                                </button>
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={userInput}
                                    onChange={(e) => {
                                        setUserInput(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = e.target.scrollHeight + 'px';
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                    placeholder="Message ChatGPT..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-[#ececec] placeholder-gray-500 py-3 max-h-[200px] resize-none overflow-y-auto scrollbar-hide text-base leading-6"
                                />
                                <button
                                    type="submit"
                                    disabled={!userInput.trim() || isStreaming}
                                    className={`p-2 rounded-full transition-all duration-200 ${!userInput.trim() || isStreaming
                                        ? 'text-gray-600'
                                        : 'bg-white text-black hover:scale-110 active:scale-95'
                                        }`}
                                >
                                    {isStreaming ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </form>
                        <p className="text-center text-[10px] text-gray-500 mt-2">
                            ChatGPT can make mistakes. Check important info.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ChatApp;