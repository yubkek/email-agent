import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailCard from '../components/EmailCard.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Dashboard({ auth, setAuth }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/emails/today`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setEmails(data.emails);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    setAuth({ authenticated: false });
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">✉️</span>
          <h1 className="text-lg font-semibold text-gray-800">Email Agent</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{auth.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800">Today's Important Emails</h2>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-sm">Fetching and ranking emails with AI...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && emails.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-medium">No emails today — you're all caught up!</p>
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-3">
            {emails.map(email => (
              <EmailCard
                key={email.id}
                email={email}
                onClick={() => navigate(`/email/${email.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
