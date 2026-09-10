import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, X, Sparkles, RefreshCw } from 'lucide-react';

export function Sidebar({
  isOpen,
  onClose,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRefreshSessions,
}) {
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const name = newSessionName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) return;

    onCreateSession(name);
    setNewSessionName('');
    setIsCreating(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-900/95 md:bg-slate-900/60 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-sm text-white">Chat Sessions</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefreshSessions}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh sessions"
              aria-label="Refresh sessions"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Chat Button / Form */}
        <div className="p-3 border-b border-slate-800/80">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat Session</span>
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-2 animate-in fade-in">
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="session-name (e.g. math-notes)"
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!newSessionName.trim()}
                  className="flex-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="py-1 px-2 text-slate-400 hover:text-slate-200 text-xs rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No sessions yet. Click New Chat to start.
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  onClick={() => onSelectSession(sess.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-medium border border-slate-700/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="truncate">{sess.title || sess.id}</span>
                  </div>

                  {/* Delete session button (except default) */}
                  {sess.id !== 'default' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete session "${sess.title || sess.id}"?`)) {
                          onDeleteSession(sess.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition-opacity"
                      title="Delete session"
                      aria-label={`Delete session ${sess.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span>AI Terminal Agent v2.0</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </span>
        </div>
      </aside>
    </>
  );
}
