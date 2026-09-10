import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Globe, AlertCircle, X, Sparkles } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export function ChatInput({ onSendMessage, disabled = false, placeholder = "Type a message or use your voice..." }) {
  const [inputText, setInputText] = useState('');
  const [speechLang, setSpeechLang] = useState('en-IN'); // 'en-IN' or 'hi-IN'
  const [isVoiceInputOrigin, setIsVoiceInputOrigin] = useState(false);
  const textareaRef = useRef(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
  } = useSpeechRecognition({
    language: speechLang,
    onResult: (finalText) => {
      // Append transcribed text into input box so user can see and edit
      setInputText((prev) => {
        const trimmed = prev.trim();
        const separator = trimmed ? ' ' : '';
        return trimmed + separator + finalText;
      });
      setIsVoiceInputOrigin(true);
      resetTranscript();
    },
  });

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [inputText, interimTranscript]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      clearError();
      startListening(speechLang);
    }
  };

  const handleLanguageChange = (newLang) => {
    setSpeechLang(newLang);
    if (isListening) {
      stopListening();
      setTimeout(() => {
        startListening(newLang);
      }, 200);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const messageToSend = inputText.trim();

    if (!messageToSend || disabled) return;

    if (isListening) {
      stopListening();
    }

    onSendMessage(messageToSend, { isVoice: isVoiceInputOrigin });
    setInputText('');
    setIsVoiceInputOrigin(false);
    resetTranscript();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Speech Error / Permission Alert */}
      {speechError && (
        <div className="mb-3 p-3 bg-red-950/70 border border-red-800/80 rounded-xl flex items-start justify-between gap-2 text-red-200 text-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-200 p-1 rounded-md transition-colors"
            title="Dismiss error"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Unsupported Browser Alert */}
      {!isSpeechSupported && (
        <div className="mb-3 p-2.5 bg-amber-950/60 border border-amber-800/60 rounded-xl flex items-center gap-2 text-amber-200 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Speech Recognition is not supported by your current browser. Please use Chrome, Edge, or Safari for voice input.</span>
        </div>
      )}

      {/* Main Input Container */}
      <div className={`relative bg-slate-900/90 backdrop-blur-md rounded-2xl border transition-all duration-200 shadow-xl ${
        isListening
          ? 'border-red-500/70 ring-2 ring-red-500/30 shadow-red-950/40'
          : 'border-slate-800 hover:border-slate-700 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20'
      }`}>

        {/* Live Listening Banner */}
        {isListening && (
          <div className="px-4 pt-3 pb-1 flex items-center justify-between text-xs border-b border-red-900/30 text-red-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-medium tracking-wide">Listening... ({speechLang === 'hi-IN' ? 'Hindi / हिंदी' : 'English / Hinglish'})</span>
              {/* Animated Waveform Indicator */}
              <div className="flex items-center gap-0.5 h-3 ml-1">
                <span className="wave-bar w-0.5 bg-red-400 rounded-full"></span>
                <span className="wave-bar w-0.5 bg-red-400 rounded-full"></span>
                <span className="wave-bar w-0.5 bg-red-400 rounded-full"></span>
                <span className="wave-bar w-0.5 bg-red-400 rounded-full"></span>
                <span className="wave-bar w-0.5 bg-red-400 rounded-full"></span>
              </div>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              Stop recording
            </button>
          </div>
        )}

        {/* Text Input Area */}
        <div className="p-2 sm:p-3">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (!e.target.value) {
                setIsVoiceInputOrigin(false);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening... Speak now..." : placeholder}
            disabled={disabled}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none resize-none text-sm sm:text-base leading-relaxed max-h-[180px] px-2 py-1"
            aria-label="Chat input"
          />

          {/* Interim transcript preview while speaking */}
          {isListening && interimTranscript && (
            <div className="px-2 pb-1 text-xs text-indigo-300/80 italic animate-pulse">
              "{interimTranscript}..."
            </div>
          )}

          {/* Bottom Bar: Language Selector, Mic Button, Send Button */}
          <div className="flex items-center justify-between pt-2 px-1 border-t border-slate-800/60 mt-1">
            {/* Left: Language Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 flex items-center gap-1 hidden sm:inline-flex">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Voice:</span>
              </span>
              
              <div className="inline-flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en-IN')}
                  className={`px-2 py-1 rounded-md transition-all font-medium ${
                    speechLang === 'en-IN'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="English (India / Hinglish)"
                  aria-label="Select English speech recognition"
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hi-IN')}
                  className={`px-2 py-1 rounded-md transition-all font-medium ${
                    speechLang === 'hi-IN'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Hindi (हिंदी)"
                  aria-label="Select Hindi speech recognition"
                >
                  हिंदी (Hindi)
                </button>
              </div>

              {isVoiceInputOrigin && inputText.trim() && (
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full ml-1">
                  <Sparkles className="w-3 h-3" /> Voice transcribed (editable)
                </span>
              )}
            </div>

            {/* Right: Mic Button & Send Button */}
            <div className="flex items-center gap-2">
              {/* Microphone Button */}
              <button
                type="button"
                onClick={handleMicToggle}
                disabled={!isSpeechSupported || disabled}
                className={`relative p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  isListening
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 hover:bg-red-500 focus:ring-red-500'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 focus:ring-indigo-500 border border-slate-700/60'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title={
                  isListening
                    ? "Click to stop recording"
                    : `Click to speak (${speechLang === 'hi-IN' ? 'Hindi' : 'English'})`
                }
                aria-label={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? (
                  <>
                    <Mic className="w-5 h-5 animate-bounce" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </>
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!inputText.trim() || disabled}
                className={`p-2.5 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-center ${
                  inputText.trim() && !disabled
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-800'
                }`}
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
