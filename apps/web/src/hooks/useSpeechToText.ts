import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechToText(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
          let fullTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
          }
          const cleanText = fullTranscript.trim();
          if (cleanText) {
            console.log('🎙️ [Speech Recognized]:', cleanText);
            if (onTranscriptRef.current) {
              onTranscriptRef.current(cleanText);
            }
          }
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.warn('🎙️ Speech recognition event error:', event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
          } else if (event.error === 'no-speech') {
            setErrorMessage('No speech detected. Please speak closer to your mic.');
          } else if (event.error !== 'aborted') {
            setErrorMessage(`Mic notice: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []); // Run ONCE on mount

  const toggleListening = useCallback(() => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      try {
        recognition.stop();
      } catch {}
      setIsListening(false);
    } else {
      setErrorMessage(null);
      try {
        recognition.start();
      } catch (err: any) {
        try {
          recognition.abort();
          setTimeout(() => recognition.start(), 150);
        } catch (e) {
          console.warn('Error starting speech recognition:', e);
        }
      }
    }
  }, [isListening, isSupported]);

  return { isListening, isSupported, errorMessage, toggleListening };
}
