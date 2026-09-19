import React, { useState } from 'react';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-800/60 transition-all"
        title="Profile"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white">
          {initials}
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 w-56 bg-surface-800 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in">
            {/* User info */}
            <div className="p-3 border-b border-slate-800">
              <p className="text-sm font-semibold text-slate-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
            </div>

            <div className="p-1.5">
              <button
                onClick={() => { setOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-all"
              >
                <Settings className="w-4 h-4 text-slate-400" /> Settings
              </button>
              <button
                onClick={() => { setOpen(false); logout(); navigate('/login'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
