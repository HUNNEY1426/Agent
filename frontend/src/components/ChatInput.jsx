import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import VoiceButton from './VoiceButton';
import { fileService } from '../services/fileService';

export default function ChatInput({ onSendMessage, disabled = false, placeholder = 'Ask anything or ask questions about your uploaded PDF...' }) {
  const [text, setText] = useState('');
  const [isVoice, setIsVoice] = useState(false);
  const [speechLang, setSpeechLang] = useState('en-IN');
  const [uploading, setUploading] = useState(null); // { name, progress, status }
  const [indexedFiles, setIndexedFiles] = useState([]); // [{ name, id, pageCount }]
  const [uploadError, setUploadError] = useState(null);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    isListening, isTranscribing, interimTranscript, error: speechError,
    isSupported, startListening, stopListening, resetTranscript, clearError,
  } = useSpeechRecognition({
    language: speechLang,
    onResult: (finalText) => {
      setText(prev => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${finalText}` : finalText;
      });
      setIsVoice(true);
    },
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  const handleSubmit = () => {
    let messageText = text.trim();
    if (isListening) {
      const flushed = stopListening();
      if (flushed && typeof flushed === 'string' && flushed.trim()) {
        messageText = messageText ? `${messageText} ${flushed.trim()}` : flushed.trim();
      }
    }
    if (!messageText || disabled) return;
    const primaryFile = indexedFiles[0];
    onSendMessage(messageText, {
      isVoice,
      files: indexedFiles.length > 0 ? [...indexedFiles] : undefined,
      pdfName: primaryFile?.name,
      pdfId: primaryFile?.id,
    });
    setText('');
    setIsVoice(false);
    setIndexedFiles([]);
    resetTranscript();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      const flushed = stopListening();
      if (flushed && typeof flushed === 'string' && flushed.trim()) {
        setText(prev => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${flushed.trim()}` : flushed.trim();
        });
        setIsVoice(true);
      }
    } else {
      clearError();
      startListening(speechLang);
    }
  };

  const handleLanguageChange = (newLang) => {
    setSpeechLang(newLang);
    if (isListening) {
      stopListening();
      setTimeout(() => startListening(newLang), 100);
    }
  };

  const handlePaperclipClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setUploadError('Supported files: PDF only (.pdf)');
      return;
    }

    setUploadError(null);
    setUploading({ name: file.name, progress: 0 });

    try {
      const res = await fileService.uploadPDF(file, (progress) => {
        setUploading({ name: file.name, progress });
      });

      const newIndexed = {
        name: res.filename || res.metadata?.originalFilename || file.name,
        id: res.metadata?.id || `pdf-${Date.now()}`,
        pageCount: res.metadata?.pageCount || 1,
      };

      setIndexedFiles(prev => {
        const filtered = prev.filter(f => f.name !== newIndexed.name);
        return [...filtered, newIndexed];
      });
    } catch (err) {
      console.error('File upload failed:', err);
      setUploadError(err.response?.data?.error || err.message || 'Failed to upload and index PDF.');
    } finally {
      setUploading(null);
    }
  };

  const removeFile = (idx) => {
    setIndexedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 pb-3 sm:px-4 sm:pb-4">
      {/* Hidden file input strictly for PDF */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,application/pdf"
        className="hidden"
        aria-label="Upload PDF"
      />

      {/* Speech error */}
      {speechError && (
        <div className="mb-2 p-2.5 bg-red-950/60 border border-red-800/60 rounded-xl flex items-center justify-between text-xs text-red-300">
          <span>{speechError}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-200 p-1"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mb-2 p-2.5 bg-amber-950/60 border border-amber-800/60 rounded-xl flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-amber-400 hover:text-amber-200 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          <span>📎 {uploading.name} — Uploading & Indexing ({uploading.progress}%)...</span>
        </div>
      )}

      {/* Uploaded / Indexed attachments */}
      {indexedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {indexedFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs text-zinc-200 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              <span className="font-medium truncate max-w-[200px]">{file.name}</span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700/60">
                <CheckCircle2 className="w-2.5 h-2.5 text-zinc-300" /> Indexed
              </span>
              <button
                onClick={() => removeFile(i)}
                className="text-zinc-400 hover:text-white p-0.5 rounded hover:bg-zinc-800 transition-colors"
                title="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className={`relative bg-surface-850/95 backdrop-blur-md rounded-2xl border transition-all duration-200 shadow-2xl shadow-black/80 ${
        isListening
          ? 'border-red-500/50 ring-2 ring-red-500/20'
          : isTranscribing
          ? 'border-zinc-600 ring-2 ring-zinc-500/20'
          : 'border-zinc-800 hover:border-zinc-700 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-white/10'
      }`}>
        {/* Listening / Transcribing banner */}
        {(isListening || isTranscribing) && (
          <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-xs border-b border-zinc-800 text-zinc-300">
            <div className="flex items-center gap-2">
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                  <span className="font-medium text-zinc-300">Transcribing audio with Whisper AI...</span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="font-medium text-red-400">
                    Recording... ({speechLang === 'hi-IN' ? 'Hindi' : 'English'})
                  </span>
                </>
              )}
            </div>
            {isListening && (
              <button
                type="button"
                onClick={handleMicToggle}
                className="text-zinc-300 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors text-[11px] font-medium"
              >
                Stop & Transcribe
              </button>
            )}
          </div>
        )}

        <div className="p-2.5 sm:p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => { setText(e.target.value); if (!e.target.value) setIsVoice(false); }}
            onKeyDown={handleKeyDown}
            placeholder={
              isTranscribing
                ? 'Transcribing audio with AI...'
                : isListening
                ? 'Recording... Speak now, then click Stop...'
                : placeholder
            }
            disabled={disabled || isTranscribing}
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none text-sm leading-relaxed max-h-[160px] px-1"
            aria-label="Chat input"
          />

          {(isListening || isTranscribing) && interimTranscript && (
            <div className="px-1 pb-1 text-xs text-zinc-400 italic animate-pulse">"{interimTranscript}"</div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-zinc-800/60">
            {/* Left */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePaperclipClick}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1 text-xs"
                title="Attach PDF (Supported files: PDF only)"
              >
                <Paperclip className="w-4 h-4" />
                <span className="hidden md:inline text-[11px] text-zinc-500">PDF</span>
              </button>

              {/* Language toggle for Voice */}
              <div className="hidden sm:flex items-center gap-0.5 bg-zinc-200 dark:bg-zinc-900 rounded-lg p-0.5 border border-zinc-300 dark:border-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en-IN')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all ${speechLang === 'en-IN' ? 'bg-white text-zinc-950 font-semibold shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'}`}
                >EN</button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hi-IN')}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all ${speechLang === 'hi-IN' ? 'bg-white text-zinc-950 font-semibold shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'}`}
                >HI</button>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-1.5">
              <VoiceButton
                isListening={isListening}
                isTranscribing={isTranscribing}
                isSupported={isSupported}
                disabled={disabled}
                onClick={handleMicToggle}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() || disabled}
                className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                  text.trim() && !disabled
                    ? 'bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-bold shadow-lg shadow-black/10 dark:shadow-white/10'
                    : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-850 dark:text-zinc-600 border border-zinc-300 dark:border-zinc-800 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <Send className="w-[18px] h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
