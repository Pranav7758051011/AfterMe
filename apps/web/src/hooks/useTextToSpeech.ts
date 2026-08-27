import { useState, useEffect, useCallback, useRef } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Look for modern natural English voices
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Jenny'))
        ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

        selectedVoiceRef.current = preferred || null;
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || isMuted || !text.trim()) return;

      try {
        window.speechSynthesis.cancel(); // Stop ongoing speech
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        // Clean markdown symbols for clean speech audio
        const cleanText = text
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/\[.*?\]\(.*?\)/g, '')
          .replace(/#/g, '')
          .replace(/📍|🔌|🚨|🚗|✓|💡|⚠️/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText.trim());

        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
        }
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          console.warn('TTS error event:', e);
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('TTS speak error:', err);
        setIsSpeaking(false);
      }
    },
    [isSupported, isMuted]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const toggleMute = useCallback(() => {
    if (isSpeaking) stop();
    setIsMuted((prev) => !prev);
  }, [isSpeaking, stop]);

  return {
    speak,
    stop,
    isSpeaking,
    isMuted,
    toggleMute,
    isSupported,
  };
}
