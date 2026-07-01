import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Chat from './pages/Chat.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetch(`${API}/auth/status`, { credentials: 'include' })
      .then(r => r.json())
      .then(setAuth)
      .catch(() => setAuth({ authenticated: false }));
  }, []);

  if (auth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          auth.authenticated
            ? <Navigate to="/chat" replace />
            : <Login error={searchParams.get('error')} />
        }
      />
      <Route
        path="/chat"
        element={auth.authenticated ? <Chat auth={auth} setAuth={setAuth} /> : <Navigate to="/" replace />}
      />
      <Route path="/dashboard" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
