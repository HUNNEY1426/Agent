import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Web Speech API Speech Recognition
 * Supports English ('en-IN') and Hindi ('hi-IN') speech recognition.
 */
export function useSpeechRecognition({
  language = 'en-IN',
  onResult,
  onError,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const isManuallyStoppedRef = useRef(false);
  const finalTranscriptAccumulatorRef = useRef('');

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
    }
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Recognition might already be stopped
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(
    (customLang) => {
      setError(null);
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        const msg =
          'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
        setError(msg);
        if (onError) onError(msg);
        return;
      }

      // If already listening, stop first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = customLang || language;
        recognition.maxAlternatives = 1;

        isManuallyStoppedRef.current = false;
        finalTranscriptAccumulatorRef.current = '';

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event) => {
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript;
            if (result.isFinal) {
              currentFinal += text + ' ';
            } else {
              currentInterim += text;
            }
          }

          if (currentFinal) {
            finalTranscriptAccumulatorRef.current += currentFinal;
            const fullText = finalTranscriptAccumulatorRef.current.trim();
            setTranscript(fullText);
            if (onResult) {
              onResult(fullText);
            }
          }

          setInterimTranscript(currentInterim);
        };

        recognition.onerror = (event) => {
          let friendlyError = '';
          switch (event.error) {
            case 'not-allowed':
              friendlyError =
                'Microphone access denied. Please click the camera/mic lock icon in your browser address bar and allow microphone permissions.';
              break;
            case 'service-not-allowed':
              friendlyError =
                'Microphone service is not allowed by your browser or operating system settings.';
              break;
            case 'no-speech':
              // Don't treat no-speech as fatal, just inform or allow continuing
              friendlyError = 'No speech detected. Please speak closer to your microphone.';
              break;
            case 'audio-capture':
              friendlyError =
                'No microphone detected. Please plug in or enable your microphone.';
              break;
            case 'network':
              friendlyError =
                'Network connection error during voice recognition. Please check your internet connection.';
              break;
            case 'aborted':
              // User or code stopped, no need to show scary error
              return;
            default:
              friendlyError = `Voice recognition error: ${event.error}`;
          }

          setError(friendlyError);
          if (onError) onError(friendlyError);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          // If stopped involuntarily and user didn't request stop, we don't force-restart to prevent endless loops on errors
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        const msg = `Unable to start speech recognition: ${err.message}`;
        setError(msg);
        if (onError) onError(msg);
        setIsListening(false);
      }
    },
    [language, onResult, onError]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptAccumulatorRef.current = '';
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
  };
}
