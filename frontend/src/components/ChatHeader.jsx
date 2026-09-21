import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, PanelLeftClose, PanelLeft, Settings as SettingsIcon, Sun, Moon } from 'lucide-react';
import ModelSelector from './ModelSelector';
import ThinkingSelector from './ThinkingSelector';
import ProfileMenu from './ProfileMenu';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';

export default function ChatHeader({ sidebarOpen, onToggleSidebar }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const {
    providers, currentProvider, models, currentModel,
    thinkingLevels, currentThinking,
    changeProvider, changeModel, changeThinking,
  } = useChat();

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-zinc-800/80 bg-surface-900/85 backdrop-blur-md z-10">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all lg:hidden"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 border border-zinc-700/60 flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-zinc-100 hidden sm:inline tracking-tight">AI Assistant</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <ModelSelector
          providers={providers}
          currentProvider={currentProvider}
          onProviderChange={changeProvider}
          models={models}
          currentModel={currentModel}
          onModelChange={changeModel}
        />
        <ThinkingSelector
          levels={thinkingLevels}
          current={currentThinking}
          onChange={changeThinking}
          provider={currentProvider}
        />
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-800 transition-all"
          title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-800 transition-all"
          title="Open Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
        <ProfileMenu />
      </div>
    </header>
  );
}
