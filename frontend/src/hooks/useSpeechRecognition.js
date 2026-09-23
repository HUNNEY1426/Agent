import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * Check if the current browser is Brave.
 * Brave blocks Google's Web Speech API servers by default,
 * so MediaRecorder + Whisper AI is preferred.
 */
function isBraveBrowser() {
  if (typeof window === 'undefined') return false;
  if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
    return true;
  }
  if (navigator.userAgentData?.brands?.some((b) => /Brave/i.test(b.brand))) {
    return true;
  }
  return /Brave/i.test(navigator.userAgent);
}

/**
 * Universal Speech Recognition hook:
 * - Uses Web Speech API where available and working (Chrome, Edge)
 * - Automatically falls back to MediaRecorder + Whisper AI in Brave, Firefox, or on network block
 * - Ensures 100% voice recognition compatibility across all browsers
 */
export function useSpeechRecognition({
  language = 'en-IN',
  onResult,
  onError,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  // Mode: 'speech-api' or 'media-recorder'
  const modeRef = useRef('speech-api');
  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const shouldListenRef = useRef(false);
  const uncommittedInterimRef = useRef('');
  const restartTimerRef = useRef(null);
  const currentLangRef = useRef(language);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    currentLangRef.current = language;
  }, [language]);

  useEffect(() => {
    const hasSpeechAPI =
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasMediaRecorder =
      typeof window !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

    if (!hasSpeechAPI && !hasMediaRecorder) {
      setIsSupported(false);
      setError('Voice recognition is not supported in this browser.');
    }
  }, []);

  // Flush any pending interim speech so words are never lost
  const flushInterim = useCallback(() => {
    const pending = (uncommittedInterimRef.current || '').trim();
    if (pending) {
      uncommittedInterimRef.current = '';
      setInterimTranscript('');
      if (onResultRef.current) {
        onResultRef.current(pending);
      }
      return pending;
    }
    return '';
  }, []);

  // ── MediaRecorder + Whisper AI Fallback ───────────────────────────────────
  const startMediaRecorder = useCallback(async (lang) => {
    modeRef.current = 'media-recorder';
    shouldListenRef.current = true;
    setError(null);
    setIsTranscribing(false);
    setIsListening(true);
    setInterimTranscript('Recording audio... Speak now, click Stop when done.');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop audio hardware tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }

        const chunks = recordedChunksRef.current;
        if (!chunks || chunks.length === 0) {
          setIsListening(false);
          setIsTranscribing(false);
          setInterimTranscript('');
          return;
        }

        const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        if (audioBlob.size < 300) {
          setIsListening(false);
          setIsTranscribing(false);
          setInterimTranscript('');
          return;
        }

        setIsListening(false);
        setIsTranscribing(true);
        setInterimTranscript('Transcribing audio with Whisper AI...');

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', lang || currentLangRef.current || 'en-IN');

          const { data } = await api.post('/ai/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 30000,
          });

          if (data?.text) {
            setTranscript((prev) => (prev ? `${prev} ${data.text}` : data.text));
            if (onResultRef.current) {
              onResultRef.current(data.text);
            }
          }
        } catch (err) {
          const msg =
            err.response?.data?.error?.message ||
            err.response?.data?.error ||
            err.message ||
            'Failed to transcribe audio';
          setError(msg);
          if (onErrorRef.current) onErrorRef.current(msg);
        } finally {
          setIsTranscribing(false);
          setInterimTranscript('');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
    } catch (err) {
      shouldListenRef.current = false;
      setIsListening(false);
      setIsTranscribing(false);
      setInterimTranscript('');

      let msg = `Microphone error: ${err.message}`;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone permission denied. Please allow microphone access in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No microphone device found. Please connect or enable your microphone.';
      }
      setError(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
    }
  }, []);

  // ── Web Speech API ────────────────────────────────────────────────────────
  const createAndStartWebSpeech = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      startMediaRecorder(currentLangRef.current);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLangRef.current || 'en-IN';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (shouldListenRef.current) {
          setIsListening(true);
          setError(null);
        }
      };

      recognition.onresult = (event) => {
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';

          if (result.isFinal) {
            const finalPiece = text.trim();
            if (finalPiece) {
              uncommittedInterimRef.current = '';
              setInterimTranscript('');
              setTranscript((prev) => (prev ? `${prev} ${finalPiece}` : finalPiece));
              if (onResultRef.current) {
                onResultRef.current(finalPiece);
              }
            }
          } else {
            currentInterim += text;
          }
        }

        const trimmedInterim = currentInterim.trim();
        uncommittedInterimRef.current = trimmedInterim;
        setInterimTranscript(trimmedInterim);
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          flushInterim();
          return;
        }

        if (event.error === 'aborted') {
          return;
        }

        // Network error in Chromium / Brave means Google Speech API was blocked.
        // Seamlessly switch to MediaRecorder + Whisper AI!
        if (event.error === 'network' || event.error === 'service-not-allowed') {
          console.warn('[Voice] Web Speech API blocked/network error. Switching to MediaRecorder + Whisper AI.');
          try {
            recognition.abort();
          } catch (e) {}
          modeRef.current = 'media-recorder';
          startMediaRecorder(currentLangRef.current);
          return;
        }

        flushInterim();
        shouldListenRef.current = false;
        setIsListening(false);

        let friendlyError = '';
        switch (event.error) {
          case 'not-allowed':
            friendlyError = 'Microphone permission denied. Please allow microphone access in your browser address bar.';
            break;
          case 'audio-capture':
            friendlyError = 'No microphone detected. Please plug in or enable your microphone.';
            break;
          default:
            friendlyError = `Voice recognition error: ${event.error}`;
        }

        setError(friendlyError);
        if (onErrorRef.current) {
          onErrorRef.current(friendlyError);
        }
      };

      recognition.onend = () => {
        flushInterim();

        if (shouldListenRef.current && modeRef.current === 'speech-api') {
          if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
          }
          restartTimerRef.current = setTimeout(() => {
            if (shouldListenRef.current && modeRef.current === 'speech-api') {
              createAndStartWebSpeech();
            }
          }, 150);
        } else if (modeRef.current === 'speech-api') {
          setIsListening(false);
          setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[Voice] Web Speech start failed. Falling back to MediaRecorder:', err.message);
      startMediaRecorder(currentLangRef.current);
    }
  }, [flushInterim, startMediaRecorder]);

  // ── Start / Stop ──────────────────────────────────────────────────────────
  const startListening = useCallback(
    (customLang) => {
      setError(null);
      if (customLang) {
        currentLangRef.current = customLang;
      }

      shouldListenRef.current = true;
      uncommittedInterimRef.current = '';
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      // If in Brave or MediaRecorder was previously chosen, use MediaRecorder directly
      if (isBraveBrowser() || modeRef.current === 'media-recorder') {
        startMediaRecorder(customLang || currentLangRef.current);
      } else {
        modeRef.current = 'speech-api';
        createAndStartWebSpeech();
      }
    },
    [startMediaRecorder, createAndStartWebSpeech]
  );

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    let flushed = '';

    if (modeRef.current === 'media-recorder') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    } else {
      flushed = flushInterim();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // ignore
        }
      }
      setIsListening(false);
      setInterimTranscript('');
    }

    return flushed;
  }, [flushInterim]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    uncommittedInterimRef.current = '';
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }
    };
  }, []);

  return {
    isListening,
    isTranscribing,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
    flushInterim,
  };
}
