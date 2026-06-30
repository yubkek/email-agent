import React from 'react';

export default function Login({ error }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#111' }}>
      <div
        className="flex flex-col items-center gap-6 w-full max-w-sm p-10 rounded-2xl"
        style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
      >
        <span className="text-4xl">✉️</span>
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-1" style={{ color: '#e2e2e2' }}>Email Agent</h1>
          <p className="text-sm" style={{ color: '#555' }}>AI-powered inbox for Gmail</p>
        </div>

        {error && (
          <div
            className="w-full text-sm rounded-lg px-4 py-2 text-center"
            style={{ background: '#2a1515', border: '1px solid #5a2a2a', color: '#f87171' }}
          >
            {error === 'access_denied' ? 'Access denied. Please try again.' : 'Authentication failed.'}
          </div>
        )}

        <a
          href="http://localhost:3001/auth/google"
          className="w-full flex items-center justify-center gap-3 text-sm font-medium rounded-lg px-4 py-3 transition"
          style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#c0c0c0' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#252525'; e.currentTarget.style.borderColor = '#3a3a3a'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1e1e1e'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
