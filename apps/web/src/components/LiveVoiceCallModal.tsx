import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  Brain, MessageSquare, Radio, CheckCircle2 
} from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { api } from '../services/api';

interface LiveVoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
}

export const LiveVoiceCallModal: React.FC<LiveVoiceCallModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
}) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'speaking' | 'listening'>('connecting');
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: `Hi! I'm your AfterMe ambient AI assistant. You're currently at ${currentLocation}. What would you like to recall or store?` }
  ]);
  const [currentThought, setCurrentThought] = useState<string | null>(null);

  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  const handleUserSpeech = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    // Interrupt AI if it is speaking
    stopSpeaking();

    // Append User utterance
    setTranscriptHistory((prev) => [...prev, { sender: 'user', text: spokenText }]);
    setCallStatus('speaking');
    setCurrentThought('Retrieving verified memories with Google Gemini 2.5 Flash...');

    try {
      const response = await api.askAfterMe(spokenText, currentLocation);
      const answer = response.answer || "I checked your memories and couldn't find a matching record.";

      setCurrentThought(null);
      setTranscriptHistory((prev) => [...prev, { sender: 'ai', text: answer }]);

      // Speak answer aloud with natural voice
      speak(answer);
    } catch (err) {
      console.warn('Voice call query error:', err);
      const fallback = "I'm listening, but had trouble reaching the memory engine. Please speak again.";
      setTranscriptHistory((prev) => [...prev, { sender: 'ai', text: fallback }]);
      speak(fallback);
    } finally {
      setCallStatus('listening');
    }
  };

  const { isListening, isSupported, toggleListening } = useSpeechToText(handleUserSpeech);

  // Initial call start
  useEffect(() => {
    if (isOpen) {
      setCallStatus('active');
      const greeting = `Hello! I am AfterMe live voice. You are at ${currentLocation}. How can I help you?`;
      speak(greeting);
      setTimeout(() => {
        setCallStatus('listening');
        if (!isListening) toggleListening();
      }, 2500);
    } else {
      stopSpeaking();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ask-drawer-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          margin: 'auto',
          background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #090d16 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(99, 102, 241, 0.3)',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div className="location-pulse" style={{ background: '#10b981', width: '8px', height: '8px' }} />
          <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a5b4fc', fontWeight: 700 }}>
            Gemini 2.5 Live Bidirectional Voice
          </span>
        </div>

        {/* Ambient Glowing Voice Orb */}
        <div
          style={{
            position: 'relative',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: isSpeaking
              ? 'radial-gradient(circle, #818cf8 0%, #4f46e5 60%, #312e81 100%)'
              : 'radial-gradient(circle, #38bdf8 0%, #0284c7 60%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isSpeaking
              ? '0 0 50px rgba(99, 102, 241, 0.9), inset 0 0 20px rgba(255,255,255,0.6)'
              : '0 0 35px rgba(56, 189, 248, 0.6), inset 0 0 15px rgba(255,255,255,0.4)',
            animation: isSpeaking ? 'pulse 1.2s infinite' : 'bounce 3s infinite ease-in-out',
            marginBottom: '24px',
          }}
        >
          <Brain size={56} color="#ffffff" />
        </div>

        {/* Status Text */}
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
          {isSpeaking ? 'AfterMe is Speaking...' : 'Listening to you...'}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '20px' }}>
          Speak naturally (e.g. "Where is my charger?" or "Remember my keys are on the desk")
        </div>

        {/* Current Thought / Reasoning Stream */}
        {currentThought && (
          <div
            style={{
              padding: '6px 14px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '20px',
              fontSize: '0.75rem',
              color: '#c7d2fe',
              marginBottom: '16px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {currentThought}
          </div>
        )}

        {/* Live Conversation Stream (Scrollable) */}
        <div
          style={{
            width: '100%',
            maxHeight: '160px',
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: 'left',
            marginBottom: '24px',
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {transcriptHistory.map((item, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
                background: item.sender === 'user' ? '#4f46e5' : 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '10px',
                maxWidth: '85%',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ fontSize: '0.7rem', color: item.sender === 'user' ? '#c7d2fe' : '#38bdf8' }}>
                {item.sender === 'user' ? 'You' : 'AfterMe'}:
              </strong>{' '}
              {item.text}
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={toggleListening}
            title={isListening ? 'Mute Microphone' : 'Unmute Microphone'}
            style={{ width: '48px', height: '48px', borderRadius: '50%' }}
          >
            {isListening ? <Mic size={20} color="#34d399" /> : <MicOff size={20} color="#f87171" />}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={onClose}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.7)',
            }}
            title="End Live Voice Call"
          >
            <PhoneOff size={24} color="#ffffff" />
          </button>
        </div>
      </div>
    </div>
  );
};
