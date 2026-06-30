import React, { useState } from 'react';

const API = 'http://localhost:3001';

const TOOL_META = {
  list_today_emails: { icon: '📋', label: "Listed today's emails" },
  read_email:        { icon: '📖', label: 'Read email' },
  search_emails:     { icon: '🔍', label: 'Searched emails' },
  create_draft:      { icon: '📝', label: 'Created draft' },
  send_reply:        { icon: '📤', label: 'Sent reply' },
};

/* ── Tool step row ── */
function ToolStep({ step }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[step.name] || { icon: '⚙️', label: step.name };
  const pending = step.result === null;
  const isError = step.result?.error;

  return (
    <div className="rounded-lg overflow-hidden text-xs" style={{ border: '1px solid #2a2a2a', background: '#151515' }}>
      <button
        onClick={() => !pending && setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition"
        style={{ color: isError ? '#f87171' : pending ? '#555' : '#888' }}
      >
        <span>{meta.icon}</span>
        <span style={{ fontFamily: 'monospace' }}>{meta.label}</span>
        {step.args?.query && <span style={{ color: '#555' }}>— "{step.args.query}"</span>}
        {pending && (
          <span className="ml-auto w-3 h-3 rounded-full border animate-spin shrink-0" style={{ borderColor: '#33333380', borderTopColor: '#555' }} />
        )}
        {!pending && (
          <span className="ml-auto shrink-0" style={{ color: '#333' }}>{open ? '▲' : '▼'}</span>
        )}
      </button>
      {open && !pending && (
        <pre
          className="px-3 py-2 overflow-x-auto text-[11px] leading-relaxed max-h-48"
          style={{ borderTop: '1px solid #2a2a2a', color: '#666', fontFamily: 'monospace', background: '#0d0d0d' }}
        >
          {JSON.stringify(step.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ── Email thread list ── */
function ThreadItem({ thread }) {
  const [expanded, setExpanded] = useState(false);
  const isThread = thread.messages.length > 1;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a2a', background: '#151515' }}>
      <button
        onClick={() => isThread && setExpanded(e => !e)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 transition"
        style={{ cursor: isThread ? 'pointer' : 'default' }}
        onMouseEnter={e => { if (isThread) e.currentTarget.style.background = '#1a1a1a'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: '#e2e2e2' }}>{thread.subject}</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: '#555' }}>{thread.snippet}</p>
        </div>
        {isThread && (
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#1d3461', color: '#60a5fa' }}>
              {thread.messages.length}
            </span>
            <span className="text-[10px]" style={{ color: '#444' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        )}
      </button>
      {isThread && expanded && (
        <div style={{ borderTop: '1px solid #2a2a2a' }}>
          {thread.messages.map((msg, i) => (
            <div
              key={msg.id}
              className="px-4 py-2 flex gap-2 text-xs"
              style={{ borderTop: i > 0 ? '1px solid #1e1e1e' : 'none', background: '#0d0d0d' }}
            >
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: '#3b82f6' }} />
              <div className="min-w-0">
                <span className="font-medium" style={{ color: '#999' }}>
                  {msg.from?.replace(/<[^>]+>/, '').trim() || msg.from}
                </span>
                <span className="ml-2" style={{ color: '#444' }}>{msg.snippet?.slice(0, 80)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadList({ threads }) {
  return (
    <div className="flex flex-col gap-2 w-full mt-1">
      {threads.map(t => <ThreadItem key={t.threadId} thread={t} />)}
    </div>
  );
}

/* ── Draft compose window ── */
function DraftCompose({ draft }) {
  const [body, setBody] = useState(draft.body);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!window.confirm('Send this email now?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/emails/${draft.emailId}/send`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: body }),
      });
      const data = await res.json();
      setStatus(data.ok ? 'sent' : 'error');
    } catch { setStatus('error'); }
    finally { setLoading(false); }
  }

  async function handleUpdateDraft() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/emails/${draft.emailId}/draft`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: body }),
      });
      const data = await res.json();
      setStatus(data.ok ? 'updated' : 'error');
    } catch { setStatus('error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="rounded-xl overflow-hidden w-full mt-1" style={{ border: '1px solid #2a2a2a', background: '#111' }}>
      {/* Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}>
        <span className="text-xs font-medium" style={{ color: '#777', fontFamily: 'monospace' }}>New Message</span>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
        </div>
      </div>

      {/* Headers */}
      <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <span className="text-xs w-14 shrink-0" style={{ color: '#444', fontFamily: 'monospace' }}>To</span>
        <span className="text-sm" style={{ color: '#b0b0b0' }}>{draft.to}</span>
      </div>
      <div className="flex items-center gap-3 px-4 py-2" style={{ borderBottom: '1px solid #1e1e1e' }}>
        <span className="text-xs w-14 shrink-0" style={{ color: '#444', fontFamily: 'monospace' }}>Subject</span>
        <span className="text-sm" style={{ color: '#b0b0b0' }}>{draft.subject}</span>
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        disabled={status === 'sent'}
        rows={6}
        className="w-full px-4 py-3 text-sm resize-none focus:outline-none disabled:opacity-40"
        style={{ background: 'transparent', color: '#d0d0d0', fontFamily: 'inherit', caretColor: '#e2e2e2' }}
      />

      {/* Footer */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: '1px solid #2a2a2a', background: '#0d0d0d' }}>
        {status === 'sent' ? (
          <span className="text-sm" style={{ color: '#4ade80' }}>Sent!</span>
        ) : (
          <>
            <button
              onClick={handleSend}
              disabled={loading}
              className="text-sm px-4 py-1.5 rounded-lg font-medium transition disabled:opacity-40"
              style={{ background: '#3b82f6', color: '#fff' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2563eb'; }}
              onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
            <button
              onClick={handleUpdateDraft}
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded-lg transition disabled:opacity-40"
              style={{ color: '#666' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.color = '#aaa'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666'; }}
            >
              Update Draft
            </button>
          </>
        )}
        {status === 'updated' && <span className="text-xs ml-1" style={{ color: '#555' }}>Draft updated in Gmail</span>}
        {status === 'error' && <span className="text-xs ml-1" style={{ color: '#f87171' }}>Something went wrong</span>}
      </div>
    </div>
  );
}

/* ── Inline markdown renderer (bold + newlines) ── */
function renderContent(text) {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j} style={{ color: '#e2e2e2', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
        : part
    );
    return <span key={i}>{rendered}{i < arr.length - 1 && <br />}</span>;
  });
}

/* ── Main export ── */
export default function AgentMessage({ steps = [], content, thinking, emailList, draft }) {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={{ background: '#1d3461', color: '#60a5fa' }}
      >
        A
      </div>

      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {steps.map((step, i) => <ToolStep key={i} step={step} />)}

        {thinking && !content && (
          <div className="flex gap-1 items-center py-1">
            {[0, 150, 300].map(d => (
              <span
                key={d}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ background: '#333', animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}

        {content && (
          <div className="text-sm leading-relaxed" style={{ color: '#c8c8c8' }}>
            {renderContent(content)}
          </div>
        )}

        {emailList && <ThreadList threads={emailList} />}
        {draft && <DraftCompose draft={draft} />}
      </div>
    </div>
  );
}
