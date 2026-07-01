import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function EmailView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/emails/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setEmail(data.email);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleGenerateReply() {
    setGenerating(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/emails/${id}/generate-reply`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReply(data.reply);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/emails/${id}/draft`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: reply }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus({ type: 'success', message: 'Draft saved to Gmail.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if (!window.confirm('Send this reply now?')) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/emails/${id}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText: reply }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus({ type: 'success', message: 'Reply sent successfully.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold text-gray-800 truncate">{email.subject}</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col gap-1 mb-4 pb-4 border-b border-gray-100">
            <div className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">From: </span>{email.from}
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">To: </span>{email.to}
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">Date: </span>{email.date}
            </div>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {email.body || '(no content)'}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">AI Reply</h2>
            <button
              onClick={handleGenerateReply}
              disabled={generating}
              className="text-sm bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {generating && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />}
              {generating ? 'Generating...' : reply ? 'Regenerate' : 'Generate Reply'}
            </button>
          </div>

          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="AI-generated reply will appear here. You can edit it before sending."
            className="w-full h-40 text-sm text-gray-700 border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-300"
          />

          {status && (
            <div className={`text-sm rounded-lg px-4 py-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {status.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={!reply || sending}
              className="flex-1 text-sm border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Save as Draft
            </button>
            <button
              onClick={handleSend}
              disabled={!reply || sending}
              className="flex-1 text-sm bg-green-600 text-white rounded-lg px-4 py-2.5 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {sending ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
