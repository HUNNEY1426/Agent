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

function Section({ icon: Icon, title, iconColor, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor || 'text-slate-400'}`} /> {title}
      </h3>
      <div className="bg-surface-800/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-slate-300">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
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

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await updateProfile({ name });
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

  return (
    <div className="min-h-screen bg-surface-950">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/chat')} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-100">Settings</h1>
        </div>

        {/* Appearance */}
        <Section icon={isDark ? Moon : Sun} title="Appearance" iconColor="text-amber-400">
          <SettingRow label="Theme" description="Toggle between dark and light mode">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-850 border border-slate-700/50 text-xs text-slate-300 hover:bg-slate-800 transition-all"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-brand-400" />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
          </SettingRow>
        </Section>

        {/* AI Settings */}
        <Section icon={Cpu} title="AI Configuration" iconColor="text-brand-400">
          <SettingRow label="Provider">
            <select
              value={currentProvider}
              onChange={(e) => changeProvider(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-brand-500/50"
            >
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </SettingRow>

          <SettingRow label="Model">
            <select
              value={currentModel}
              onChange={(e) => changeModel(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-brand-500/50 max-w-[200px]"
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </SettingRow>

          <SettingRow label="Thinking Level">
            <select
              value={currentThinking}
              onChange={(e) => changeThinking(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-brand-500/50 capitalize"
            >
              {Object.keys(thinkingLevels).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </SettingRow>
        </Section>

        {/* Voice */}
        <Section icon={Volume2} title="Voice" iconColor="text-emerald-400">
          <SettingRow label="Voice">
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-850 border border-slate-700/50 text-xs text-slate-200 focus:outline-none max-w-[200px]"
            >
              <option value="">System default</option>
              {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
          </SettingRow>

          <SettingRow label="Speed" description={`${rate.toFixed(1)}x`}>
            <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={(e) => setRate(+e.target.value)} className="w-32 accent-brand-500" />
          </SettingRow>
          <SettingRow label="Pitch" description={`${pitch.toFixed(1)}`}>
            <input type="range" min="0.5" max="1.5" step="0.1" value={pitch} onChange={(e) => setPitch(+e.target.value)} className="w-32 accent-brand-500" />
          </SettingRow>
          <SettingRow label="Volume" description={`${Math.round(volume * 100)}%`}>
            <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(+e.target.value)} className="w-32 accent-brand-500" />
          </SettingRow>
        </Section>

        {/* History */}
        <Section icon={BookOpen} title="History RAG" iconColor="text-purple-400">
          <SettingRow label="Status" description={historyStatus?.totalChunks != null ? `${historyStatus.totalChunks} indexed chunks` : ''}>
            <button
              onClick={toggleHistory}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                historyStatus?.enabled
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/50'
              }`}
            >
              {historyStatus?.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </SettingRow>
          <SettingRow label="Reindex" description="Rebuild the history search index">
            <button onClick={reindexHistory} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </SettingRow>
        </Section>

        {/* Files */}
        <Section icon={FileText} title="PDF Knowledge Base" iconColor="text-emerald-400">
          <SettingRow label="Status" description={pdfStatus?.activePDF ? `Active: ${pdfStatus.activePDF}` : 'No active PDF'}>
            <span className={`text-xs ${pdfStatus?.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
              {pdfStatus?.enabled ? 'Active' : 'Inactive'}
            </span>
          </SettingRow>
          <SettingRow label="Clear all PDFs" description="Remove all indexed documents">
            <button onClick={clearPdfs} className="p-2 rounded-lg text-red-400 hover:bg-red-950/30 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </SettingRow>
        </Section>

        {/* Profile */}
        <Section icon={User} title="Profile" iconColor="text-blue-400">
          <SettingRow label="Name">
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-surface-850 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-brand-500/50 w-40"
              />
              <button
                onClick={handleSaveName}
                disabled={saving}
                className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-500 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
            </div>
          </SettingRow>
          <SettingRow label="Email">
            <span className="text-xs text-slate-500">{user?.email || 'Not set'}</span>
          </SettingRow>
          <SettingRow label="Account Created">
            <span className="text-xs text-slate-500">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
            </span>
          </SettingRow>
        </Section>
      </div>
    </div>
  );
}
