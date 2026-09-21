import React, { useState } from 'react';
import { User, Settings, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-zinc-800/60 transition-all"
        title="Profile"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border border-zinc-700/60 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
          {initials}
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-50 w-56 bg-surface-850 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-fade-in">
            {/* User info */}
            <div className="p-3 border-b border-zinc-800">
              <p className="text-sm font-semibold text-zinc-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-zinc-500 truncate">{user?.email || ''}</p>
            </div>

            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => { toggleTheme(); }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-zinc-400" />}
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase font-mono">{isDark ? 'Dark' : 'Light'}</span>
              </button>

              <button
                onClick={() => { setOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span>Settings</span>
              </button>

              <div className="my-1 border-t border-zinc-800/80" />

              <button
                onClick={() => { setOpen(false); logout(); navigate('/login'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
