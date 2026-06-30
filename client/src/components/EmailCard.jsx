import React from 'react';

function ScoreBadge({ score }) {
  const color =
    score >= 8 ? 'bg-red-100 text-red-700' :
    score >= 6 ? 'bg-orange-100 text-orange-700' :
    score >= 4 ? 'bg-yellow-100 text-yellow-700' :
    'bg-gray-100 text-gray-500';

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {score}/10
    </span>
  );
}

export default function EmailCard({ email, onClick }) {
  const fromName = email.from.replace(/<.*>/, '').trim() || email.from;
  const date = new Date(email.date);
  const timeStr = isNaN(date) ? '' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800 truncate">{fromName}</span>
        <div className="flex items-center gap-2 shrink-0">
          <ScoreBadge score={email.importanceScore} />
          <span className="text-xs text-gray-400">{timeStr}</span>
        </div>
      </div>
      <div className="text-sm font-medium text-gray-700 truncate">{email.subject}</div>
      <div className="text-xs text-gray-400 truncate">{email.snippet}</div>
    </button>
  );
}
