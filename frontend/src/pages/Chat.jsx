import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import Sidebar from '../components/Sidebar';
import ChatHeader from '../components/ChatHeader';
import ChatWindow from '../components/ChatWindow';
import FileLibrary from '../components/FileLibrary';
import HistorySearch from '../components/HistorySearch';

export default function Chat() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { initialize } = useChat();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="h-screen flex overflow-hidden bg-surface-950">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onShowFiles={() => { setShowFiles(true); setShowHistory(false); }}
        onShowHistory={() => { setShowHistory(true); setShowFiles(false); }}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex-1 flex overflow-hidden">
          <ChatWindow />

          {/* Right panel: Files or History */}
          {(showFiles || showHistory) && (
            <div className="w-80 border-l border-slate-800/80 bg-surface-900 hidden lg:flex flex-col">
              {showFiles && <FileLibrary isOpen={showFiles} onClose={() => setShowFiles(false)} />}
              {showHistory && <HistorySearch isOpen={showHistory} onClose={() => setShowHistory(false)} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
