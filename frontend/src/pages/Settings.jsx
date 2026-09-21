import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bot, Cpu, Brain, Volume2, BookOpen, FileText,
  User, Moon, Sun, Save, Loader2, RefreshCw, Power, Trash2,
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { historyService } from '../services/historyService';
import { fileService } from '../services/fileService';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-zinc-300" /> {title}
      </h3>
      <div className="bg-surface-850/80 border border-zinc-800 rounded-xl p-4 space-y-4 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-zinc-200 font-medium">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const {
    providers, currentProvider, models, currentModel,
    thinkingLevels, currentThinking,
    changeProvider, changeModel, changeThinking,
  } = useChat();

  const {
    voices, selectedVoiceURI, setSelectedVoiceURI,
    rate, setRate, pitch, setPitch, volume, setVolume,
  } = useSpeechSynthesis();

  const [historyStatus, setHistoryStatus] = useState(null);
  const [pdfStatus, setPdfStatus] = useState(null);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    historyService.getStatus().then(setHistoryStatus).catch(() => {});
    fileService.getStatus().then(setPdfStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
    } catch (e) {
      alert(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleHistory = async () => {
    try {
      if (historyStatus?.enabled) await historyService.disable();
      else await historyService.enable();
      const s = await historyService.getStatus();
      setHistoryStatus(s);
    } catch {}
  };

  const reindexHistory = async () => {
    try {
      await historyService.reindex();
      const s = await historyService.getStatus();
      setHistoryStatus(s);
    } catch {}
  };

  const clearPdfs = async () => {
    if (!confirm('Clear all indexed PDFs?')) return;
    try {
      await fileService.clearPDFs();
      const s = await fileService.getStatus();
      setPdfStatus(s);
    } catch {}
  };

  // Safe normalized providers list (handles both string and object arrays)
  const normalizedProviders = (providers || []).map((p) => {
    if (typeof p === 'object' && p !== null) {
      return {
        id: p.id,
        name: p.name || p.id,
        configured: p.configured,
      };
    }
    return {
      id: String(p),
      name: String(p).charAt(0).toUpperCase() + String(p).slice(1),
      configured: true,
    };
  });

  // Safe normalized models list
  const normalizedModels = (models || []).map((m) => {
    if (typeof m === 'object' && m !== null) {
      return {
        id: m.id || m.name,
        name: m.name || m.id,
      };
    }
    return {
      id: String(m),
      name: String(m),
    };
  });

  const thinkingKeys = Object.keys(thinkingLevels || {});

  return (
    <div className="min-h-screen bg-surface-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Settings</h1>
              <p className="text-xs text-zinc-500">Configure AI models, voice, and system preferences</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/chat')}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all shadow-sm"
          >
            Done
          </button>
        </div>

        {/* Appearance */}
        <Section icon={isDark ? Moon : Sun} title="Appearance">
          <SettingRow label="Theme" description={`Currently in ${isDark ? 'Dark' : 'Light'} mode`}>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold transition-all shadow-sm"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-zinc-400" />}
              <span>{isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}</span>
            </button>
          </SettingRow>
        </Section>

        {/* AI Settings */}
        <Section icon={Cpu} title="AI Configuration">
          <SettingRow label="Provider" description="Select your active AI service provider">
            <select
              value={currentProvider || ''}
              onChange={(e) => changeProvider(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-zinc-700/70 text-xs text-zinc-200 focus:outline-none focus:border-zinc-400"
            >
              {normalizedProviders.length > 0 ? (
                normalizedProviders.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.configured === false ? '⚠️ (Not Configured)' : ''}
                  </option>
                ))
              ) : (
                <option value={currentProvider || 'gemini'}>{currentProvider || 'Gemini'}</option>
              )}
            </select>
          </SettingRow>

          <SettingRow label="Model" description="Select the model for text generation and reasoning">
            <select
              value={currentModel || ''}
              onChange={(e) => changeModel(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-zinc-700/70 text-xs text-zinc-200 focus:outline-none focus:border-zinc-400 max-w-[200px]"
            >
              {normalizedModels.length > 0 ? (
                normalizedModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              ) : (
                <option value={currentModel || ''}>{currentModel || 'Default Model'}</option>
              )}
            </select>
          </SettingRow>

          <SettingRow label="Thinking Level" description="Reasoning effort level for supported models">
            <select
              value={currentThinking || 'medium'}
              onChange={(e) => changeThinking(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-zinc-700/70 text-xs text-zinc-200 focus:outline-none focus:border-zinc-400 capitalize"
            >
              {thinkingKeys.length > 0 ? (
                thinkingKeys.map(k => (
                  <option key={k} value={k}>
                    {thinkingLevels[k]?.label || k}
                  </option>
                ))
              ) : (
                <>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </>
              )}
            </select>
          </SettingRow>
        </Section>

        {/* Voice Settings */}
        <Section icon={Volume2} title="Voice & Speech Synthesis">
          <SettingRow label="Voice" description="Select output speaker voice">
            <select
              value={selectedVoiceURI || ''}
              onChange={(e) => setSelectedVoiceURI?.(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-zinc-700/70 text-xs text-zinc-200 focus:outline-none max-w-[200px]"
            >
              <option value="">System default</option>
              {(voices || []).map((v, idx) => (
                <option key={v.voiceURI || idx} value={v.voiceURI || ''}>
                  {v.name || 'Voice'} ({v.lang || 'en'})
                </option>
              ))}
            </select>
          </SettingRow>

          <SettingRow label="Speed" description={`${(rate ?? 1.0).toFixed(1)}x`}>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate ?? 1.0}
              onChange={(e) => setRate?.(+e.target.value)}
              className="w-32 accent-white"
            />
          </SettingRow>
          <SettingRow label="Pitch" description={`${(pitch ?? 1.0).toFixed(1)}`}>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch ?? 1.0}
              onChange={(e) => setPitch?.(+e.target.value)}
              className="w-32 accent-white"
            />
          </SettingRow>
          <SettingRow label="Volume" description={`${Math.round((volume ?? 1.0) * 100)}%`}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume ?? 1.0}
              onChange={(e) => setVolume?.(+e.target.value)}
              className="w-32 accent-white"
            />
          </SettingRow>
        </Section>

        {/* History RAG */}
        <Section icon={BookOpen} title="History RAG">
          <SettingRow label="Status" description={historyStatus?.totalChunks != null ? `${historyStatus.totalChunks} indexed chunks` : ''}>
            <button
              onClick={toggleHistory}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                historyStatus?.enabled
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-200 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700/60'
              }`}
            >
              {historyStatus?.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </SettingRow>
          <SettingRow label="Reindex" description="Rebuild the history search index">
            <button
              onClick={reindexHistory}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              title="Reindex conversations"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </SettingRow>
        </Section>

        {/* Files */}
        <Section icon={FileText} title="PDF Knowledge Base">
          <SettingRow label="Status" description={pdfStatus?.activePDF ? `Active: ${pdfStatus.activePDF}` : 'No active PDF'}>
            <span className={`text-xs ${pdfStatus?.enabled ? 'text-zinc-200 font-semibold' : 'text-zinc-500'}`}>
              {pdfStatus?.enabled ? 'Active' : 'Inactive'}
            </span>
          </SettingRow>
          <SettingRow label="Clear all PDFs" description="Remove all indexed documents">
            <button
              onClick={clearPdfs}
              className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-all"
              title="Clear all PDFs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </SettingRow>
        </Section>

        {/* Profile */}
        <Section icon={User} title="Profile">
          <SettingRow label="Name">
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-surface-850 border border-zinc-700/60 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 w-40"
              />
              <button
                onClick={handleSaveName}
                disabled={saving || !name.trim()}
                className="p-1.5 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all disabled:opacity-50 shadow-sm font-semibold"
                title="Save name"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
            </div>
          </SettingRow>
          <SettingRow label="Email">
            <span className="text-xs text-zinc-500">{user?.email || 'Not set'}</span>
          </SettingRow>
          <SettingRow label="Account Created">
            <span className="text-xs text-zinc-500">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
            </span>
          </SettingRow>
        </Section>
      </div>
    </div>
  );
}
