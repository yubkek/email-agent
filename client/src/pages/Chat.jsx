import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AgentMessage from '../components/AgentMessage.jsx';

const API = 'http://localhost:3001';
const STORAGE_KEY = 'email-agent-chats';

function loadChats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveChats(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, 60)));
}

function groupByDate(chats) {
  const DAY = 86400000;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const groups = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const chat of chats) {
    const chatDay = new Date(chat.updatedAt).setHours(0, 0, 0, 0);
    const diff = todayStart - chatDay;
    if (diff <= 0) groups[0].items.push(chat);
    else if (diff <= DAY) groups[1].items.push(chat);
    else if (diff <= 7 * DAY) groups[2].items.push(chat);
    else groups[3].items.push(chat);
  }
  return groups.filter(g => g.items.length > 0);
}

async function streamAgent(message, history, onEvent) {
  const res = await fetch(`${API}/agent/run`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try { onEvent(JSON.parse(line.slice(6))); } catch {}
      }
    }
  }
}

const SUGGESTIONS = [
  'Show me important emails from today',
  'Any unread emails from my team?',
  'Draft a reply to the latest email I got',
  'Search for emails about invoices',
];

export default function Chat({ auth, setAuth }) {
  const [chats, setChats] = useState(loadChats);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function newChat() {
    setActiveChatId(null);
    setMessages([]);
    setHistory([]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function openChat(chat) {
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setHistory(chat.history);
  }

  function deleteChat(id, e) {
    e.stopPropagation();
    const updated = chats.filter(c => c.id !== id);
    setChats(updated);
    saveChats(updated);
    if (activeChatId === id) newChat();
  }

  async function handleLogout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    setAuth({ authenticated: false });
    navigate('/');
  }

  async function send(text) {
    const userText = (text || input).trim();
    if (!userText || running) return;
    setInput('');
    setRunning(true);

    const agentId = Date.now();
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userText },
      { id: agentId, role: 'agent', steps: [], content: null, thinking: true },
    ]);

    try {
      await streamAgent(userText, history, event => {
        if (event.type === 'tool_call') {
          setMessages(prev => prev.map(m =>
            m.id === agentId
              ? { ...m, steps: [...m.steps, { id: event.id, name: event.name, args: event.args, result: null }] }
              : m
          ));
        } else if (event.type === 'tool_result') {
          setMessages(prev => prev.map(m =>
            m.id === agentId
              ? { ...m, steps: m.steps.map(s => s.id === event.id ? { ...s, result: event.result } : s) }
              : m
          ));
        } else if (event.type === 'email_list') {
          setMessages(prev => prev.map(m =>
            m.id === agentId ? { ...m, emailList: event.threads } : m
          ));
        } else if (event.type === 'draft') {
          setMessages(prev => prev.map(m =>
            m.id === agentId ? { ...m, draft: event.draft } : m
          ));
        } else if (event.type === 'message') {
          setMessages(prev => prev.map(m =>
            m.id === agentId ? { ...m, content: event.content, thinking: false } : m
          ));
        } else if (event.type === 'done') {
          const newHistory = [
            ...history,
            { role: 'user', content: userText },
            { role: 'assistant', content: event.assistantMessage || '' },
          ];
          setHistory(newHistory);

          setMessages(prev => {
            setChats(prevChats => {
              let updated;
              if (activeChatId) {
                updated = prevChats.map(c =>
                  c.id === activeChatId
                    ? { ...c, messages: prev, history: newHistory, updatedAt: Date.now() }
                    : c
                );
              } else {
                const created = {
                  id: agentId,
                  title: userText.slice(0, 55),
                  messages: prev,
                  history: newHistory,
                  createdAt: agentId,
                  updatedAt: Date.now(),
                };
                setActiveChatId(agentId);
                updated = [created, ...prevChats];
              }
              saveChats(updated);
              return updated;
            });
            return prev;
          });
        }
      });
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === agentId ? { ...m, content: `Error: ${err.message}`, thinking: false } : m
      ));
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;
  const groups = groupByDate(chats);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#1a1a1a', color: '#e2e2e2' }}>

      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 flex flex-col border-r" style={{ background: '#111', borderColor: '#2a2a2a' }}>

        {/* Logo + New chat */}
        <div className="p-3 space-y-1" style={{ borderBottom: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-2 px-2 py-1">
            <span>✉️</span>
            <span className="text-sm font-semibold" style={{ color: '#e2e2e2' }}>Email Agent</span>
          </div>
          <button
            onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition"
            style={{ color: '#888', border: '1px solid #2a2a2a' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#e2e2e2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888'; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New chat
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto py-2">
          {groups.length === 0 && (
            <p className="text-xs px-4 py-3" style={{ color: '#444' }}>No conversations yet</p>
          )}
          {groups.map(group => (
            <div key={group.label} className="mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider px-4 py-1" style={{ color: '#444' }}>
                {group.label}
              </p>
              {group.items.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => openChat(chat)}
                  className="group mx-2 flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition"
                  style={{
                    background: activeChatId === chat.id ? '#2a2a2a' : 'transparent',
                    color: activeChatId === chat.id ? '#e2e2e2' : '#777',
                  }}
                  onMouseEnter={e => { if (activeChatId !== chat.id) { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#b0b0b0'; } }}
                  onMouseLeave={e => { if (activeChatId !== chat.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#777'; } }}
                >
                  <span className="text-xs truncate flex-1 leading-relaxed">{chat.title}</span>
                  <button
                    onClick={e => deleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 ml-1 shrink-0 transition text-xs"
                    style={{ color: '#555' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#e2e2e2'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid #2a2a2a' }}>
          <p className="text-[11px] truncate mb-1.5" style={{ color: '#444' }}>{auth.email}</p>
          <button
            onClick={handleLogout}
            className="text-xs transition"
            style={{ color: '#555' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e2e2e2'}
            onMouseLeave={e => e.currentTarget.style.color = '#555'}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

            {isEmpty && (
              <div className="flex flex-col items-center gap-8 py-24">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold mb-2" style={{ color: '#e2e2e2' }}>What can I help with?</h2>
                  <p className="text-sm" style={{ color: '#555' }}>Ask me to read, search, draft, or send emails.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-sm text-left px-4 py-3 rounded-xl transition"
                      style={{ border: '1px solid #2a2a2a', color: '#777', background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#b0b0b0'; e.currentTarget.style.borderColor = '#3a3a3a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#777'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div
                    className="text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-sm"
                    style={{ background: '#1d3461', color: '#d4e4ff' }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <AgentMessage
                  key={msg.id}
                  steps={msg.steps}
                  content={msg.content}
                  thinking={msg.thinking}
                  emailList={msg.emailList}
                  draft={msg.draft}
                />
              )
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid #2a2a2a' }}>
          <div className="max-w-2xl mx-auto">
            <div
              className="flex gap-3 rounded-2xl px-4 py-3 transition-colors"
              style={{ background: '#111', border: '1px solid #2a2a2a' }}
              onFocusCapture={e => e.currentTarget.style.borderColor = '#3a3a3a'}
              onBlurCapture={e => e.currentTarget.style.borderColor = '#2a2a2a'}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your emails..."
                rows={1}
                disabled={running}
                className="flex-1 resize-none text-sm bg-transparent focus:outline-none disabled:opacity-40 max-h-32"
                style={{ color: '#e2e2e2', caretColor: '#e2e2e2' }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || running}
                className="self-end w-8 h-8 rounded-lg flex items-center justify-center transition shrink-0 disabled:opacity-20 disabled:cursor-not-allowed"
                style={{ background: '#e2e2e2', color: '#111' }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#fff'; }}
                onMouseLeave={e => e.currentTarget.style.background = '#e2e2e2'}
              >
                {running
                  ? <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: '#11111140', borderTopColor: '#111' }} />
                  : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12V2M2 7l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                }
              </button>
            </div>
            <p className="text-center text-[10px] mt-2" style={{ color: '#333' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
