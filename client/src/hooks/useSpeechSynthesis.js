import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Clean markdown symbols, code blocks, and formatting for natural speech
 */
export function cleanTextForSpeech(text) {
  if (!text || typeof text !== 'string') return '';

  return (
    text
      // Remove code blocks and replace with brief announcement
      .replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, ' [Code block omitted] ')
      .replace(/```[\s\S]*?```/g, ' [Code block omitted] ')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove markdown links [title](url) -> title
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Remove headers (# Header)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold and italics
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove blockquotes (> quote)
      .replace(/^>\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Remove bullet list markers (- , * , + )
      .replace(/^[\*\-+]\s+/gm, '')
      // Remove numbered list markers (1. , 2. )
      .replace(/^\d+\.\s+/gm, '')
      // Replace table pipes and formatting
      .replace(/\|/g, ', ')
      // Normalize whitespace and newlines
      .replace(/[\r\n]+/g, '. ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/**
 * Split text into sentence-sized chunks for reliable SpeechSynthesis
 * Handles English punctuation (. ? !) and Hindi Purna Viram (।)
 */
export function chunkText(text, maxChunkLength = 160) {
  if (!text) return [];

  // Match sentence delimiters while keeping them
  const regex = /([^.?!।]+[.?!।]+)|([^.?!।]+$)/g;
  const matches = text.match(regex) || [text];
  const chunks = [];

  for (let piece of matches) {
    piece = piece.trim();
    if (!piece) continue;

    if (piece.length <= maxChunkLength) {
      chunks.push(piece);
    } else {
      // Split long piece by comma or space
      const words = piece.split(' ');
      let current = '';
      for (const word of words) {
        if ((current + ' ' + word).trim().length <= maxChunkLength) {
          current = (current + ' ' + word).trim();
        } else {
          if (current) chunks.push(current);
          current = word;
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks;
}

/**
 * Custom hook for SpeechSynthesis (Voice Output)
 */
export function useSpeechSynthesis() {
  const [voices, setVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [rate, setRate] = useState(1.0); // 0.5 - 2.0
  const [pitch, setPitch] = useState(1.0); // 0.5 - 1.5
  const [volume, setVolume] = useState(1.0); // 0 - 1.0
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const chunksRef = useRef([]);
  const currentChunkIndexRef = useRef(0);
  const activeMessageIdRef = useRef(null);
  const synthRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);

  // Initialize SpeechSynthesis and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    synthRef.current = window.speechSynthesis;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    };
  }, []);

  // Stop any ongoing speech
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch (e) {
        // ignore
      }
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    chunksRef.current = [];
    currentChunkIndexRef.current = 0;
    activeMessageIdRef.current = null;
    setSpeakingMessageId(null);
    setIsSpeaking(false);
  }, []);

  // Pick the best voice based on language and available system voices
  const findBestVoice = useCallback(
    (text, preferredURI) => {
      if (!voices || voices.length === 0) return null;

      // 1. If user explicitly chose a voice in settings
      if (preferredURI) {
        const custom = voices.find((v) => v.voiceURI === preferredURI);
        if (custom) return custom;
      }

      // 2. Check if text has Devanagari script (Hindi)
      const isHindi = /[\u0900-\u097F]/.test(text);

      if (isHindi) {
        // Find Hindi voice
        const hindiVoice = voices.find(
          (v) =>
            v.lang.toLowerCase().includes('hi') ||
            v.name.toLowerCase().includes('hindi')
        );
        if (hindiVoice) return hindiVoice;
      }

      // 3. Find Indian English voice first if available, else standard English
      const indianEnglishVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes('en-in') ||
          v.name.toLowerCase().includes('india')
      );
      if (indianEnglishVoice) return indianEnglishVoice;

      const englishVoice = voices.find((v) =>
        v.lang.toLowerCase().startsWith('en')
      );
      if (englishVoice) return englishVoice;

      // Fallback: Default voice
      return voices.find((v) => v.default) || voices[0];
    },
    [voices]
  );

  // Play a sequence of text chunks
  const playNextChunk = useCallback(
    (voice) => {
      if (!synthRef.current) return;

      const chunks = chunksRef.current;
      const index = currentChunkIndexRef.current;

      if (index >= chunks.length) {
        // All chunks finished
        stopSpeaking();
        return;
      }

      const chunkText = chunks[index];
      const utterance = new SpeechSynthesisUtterance(chunkText);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'en-IN';
      }

      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onend = () => {
        currentChunkIndexRef.current += 1;
        playNextChunk(voice);
      };

      utterance.onerror = (event) => {
        // 'interrupted' / 'canceled' happens when stopped manually
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.warn('Speech synthesis utterance error:', event.error);
        }
        currentChunkIndexRef.current += 1;
        if (currentChunkIndexRef.current < chunks.length) {
          playNextChunk(voice);
        } else {
          stopSpeaking();
        }
      };

      try {
        synthRef.current.speak(utterance);
      } catch (err) {
        console.error('Error speaking utterance:', err);
        stopSpeaking();
      }
    },
    [rate, pitch, volume, stopSpeaking]
  );

  // Speak a message
  const speakMessage = useCallback(
    (messageId, rawText) => {
      if (!isSupported || !synthRef.current) return;

      // If already speaking this message, toggle stop
      if (isSpeaking && activeMessageIdRef.current === messageId) {
        stopSpeaking();
        return;
      }

      // Stop previous speech if any
      stopSpeaking();

      const cleaned = cleanTextForSpeech(rawText);
      if (!cleaned) return;

      const chunks = chunkText(cleaned);
      if (chunks.length === 0) return;

      chunksRef.current = chunks;
      currentChunkIndexRef.current = 0;
      activeMessageIdRef.current = messageId;
      setSpeakingMessageId(messageId);
      setIsSpeaking(true);

      const targetVoice = findBestVoice(cleaned, selectedVoiceURI);

      // Chrome speech synthesis keep-alive workaround
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      keepAliveIntervalRef.current = setInterval(() => {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      playNextChunk(targetVoice);
    },
    [isSupported, isSpeaking, selectedVoiceURI, findBestVoice, playNextChunk, stopSpeaking]
  );

  return {
    isSupported,
    isSpeaking,
    speakingMessageId,
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
    speakMessage,
    stopSpeaking,
    cleanTextForSpeech,
  };
}
