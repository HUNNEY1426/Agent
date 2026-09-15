import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bot, Plus, Search, MessageSquare, FileText, BookOpen, Settings, LogOut,
  X, MoreHorizontal, Loader2,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import ContextMenu from './ContextMenu';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function Sidebar({ isOpen, onClose, onShowFiles, onShowHistory }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const {
    sessions, activeSessionId, switchSession, createSession,
    deleteSession, renameSession, duplicateSession, archiveSession,
  } = useChat();

  const [search, setSearch] = useState('');
  const [ctxMenu, setCtxMenu] = useState(null);
  const [creating, setCreating] = useState(false);

  const filteredSessions = sessions.filter(s =>
    !search || (s.title || s.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = async () => {
    const name = `chat-${Date.now()}`;
    setCreating(true);
    try {
      await createSession(name);
      onClose?.();
    } catch {}
    setCreating(false);
  };

  const handleSelectSession = async (id) => {
    await switchSession(id);
    onClose?.();
    if (location.pathname !== '/chat') navigate('/chat');
  };

  const handleContextMenu = (e, sessionId) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ sessionId, position: { x: e.clientX, y: e.clientY } });
  };

  const handleRename = async (id) => {
    const newName = prompt('New name:', id);
    if (newName && newName.trim() && newName !== id) {
      try { await renameSession(id, newName.trim()); } catch (e) { alert(e.message); }
    }
  };

  const handleDelete = async (id) => {
    if (confirm(`Delete "${id}"?`)) {
      try { await deleteSession(id); } catch (e) { alert(e.message); }
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-[280px] flex flex-col bg-surface-900 border-r border-slate-800/80 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-900/30">
              <Bot className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-100">AI Agent</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={handleNewChat}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-all shadow-lg shadow-brand-600/20 disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-850 border border-slate-800/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="px-2 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Chats</p>
          </div>
          <div className="space-y-0.5">
            {filteredSessions.length === 0 ? (
              <p className="text-xs text-slate-600 px-3 py-4 text-center">No conversations</p>
            ) : (
              filteredSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  onContextMenu={(e) => handleContextMenu(e, session.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                    activeSessionId === session.id
                      ? 'bg-brand-600/15 border border-brand-500/20 text-brand-200'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeSessionId === session.id ? 'text-brand-400' : 'text-slate-600'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{session.title || session.id}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-600">{session.messagesCount || session.messageCount || 0} msgs</span>
                        <span className="text-[10px] text-slate-700">·</span>
                        <span className="text-[10px] text-slate-600">{timeAgo(session.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleContextMenu(e, session.id)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-all"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="border-t border-slate-800/80 px-2 py-2 space-y-0.5">
          <button
            onClick={() => { onShowHistory?.(); onClose?.(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" /> History
          </button>
          <button
            onClick={() => { onShowFiles?.(); onClose?.(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" /> Files
          </button>
          <button
            onClick={() => { navigate('/settings'); onClose?.(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" /> Settings
          </button>
        </div>

        {/* User */}
        <div className="border-t border-slate-800/80 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || ''}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {ctxMenu && (
        <ContextMenu
          sessionId={ctxMenu.sessionId}
          position={ctxMenu.position}
          onClose={() => setCtxMenu(null)}
          onRename={handleRename}
          onDelete={handleDelete}
          onDuplicate={duplicateSession}
          onArchive={archiveSession}
        />
      )}
    </>
  );
}
