import React, { useState, useEffect } from 'react';
import { historyService } from '../services/historyService';
import { BookOpen, Search, Power, RefreshCw, X, Loader2, Brain } from 'lucide-react';

export default function HistorySearch({ isOpen, onClose }) {
  const [status, setStatus] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (isOpen) loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const s = await historyService.getStatus();
      setStatus(s);
    } catch {}
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await historyService.search(query);
      setResults(res.results || []);
    } catch {}
    setSearching(false);
  };

  const toggleEnabled = async () => {
    try {
      if (status?.enabled) {
        await historyService.disable();
      } else {
        await historyService.enable();
      }
      await loadStatus();
    } catch {}
  };

  const handleReindex = async () => {
    try {
      await historyService.reindex();
      await loadStatus();
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400" /> History RAG
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
      </div>

      {/* Status */}
      <div className="px-4 py-2.5 border-b border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${status?.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className={status?.enabled ? 'text-emerald-400' : 'text-slate-500'}>
            {status?.enabled ? 'Enabled' : 'Disabled'}
          </span>
          {status?.totalChunks != null && (
            <span className="text-slate-500">· {status.totalChunks} chunks</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleReindex} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800" title="Reindex">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={toggleEnabled} className={`p-1.5 rounded-lg transition-all ${status?.enabled ? 'text-emerald-400 hover:bg-emerald-900/30' : 'text-slate-500 hover:bg-slate-800'}`} title="Toggle">
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2.5 border-b border-slate-800/50">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search previous chats..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-surface-850 border border-slate-700/40 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={searching} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {results.length === 0 && query && !searching ? (
          <p className="text-xs text-slate-500 text-center py-6">No results found</p>
        ) : results.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Search your conversation history</p>
          </div>
        ) : (
          results.map((r, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-surface-850 border border-slate-800/40 hover:border-slate-700/60 transition-all">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-medium text-purple-400">{r.sessionId || r.session || 'Chat'}</span>
                {r.role && <span className="text-[10px] text-slate-600">· {r.role}</span>}
                {r.score && <span className="text-[10px] text-slate-600">· {(r.score * 100).toFixed(0)}%</span>}
              </div>
              <p className="text-xs text-slate-400 line-clamp-3">{r.text || r.content || ''}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
