import React from 'react';
import { Bot, PanelLeftClose, PanelLeft } from 'lucide-react';
import ModelSelector from './ModelSelector';
import ThinkingSelector from './ThinkingSelector';
import ProfileMenu from './ProfileMenu';
import { useChat } from '../context/ChatContext';

export default function ChatHeader({ sidebarOpen, onToggleSidebar }) {
  const {
    providers, currentProvider, models, currentModel,
    thinkingLevels, currentThinking,
    changeProvider, changeModel, changeThinking,
  } = useChat();

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-800/80 bg-surface-900/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all lg:hidden"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-100 hidden sm:inline">AI Assistant</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
        <ProfileMenu />
      </div>
    </header>
  );
}
