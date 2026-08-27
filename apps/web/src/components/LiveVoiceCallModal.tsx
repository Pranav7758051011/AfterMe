import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  Brain, MessageSquare, Radio, CheckCircle2, Send, AlertCircle 
} from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { api } from '../services/api';

interface LiveVoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
}

const QUICK_CALL_QUESTIONS = [
  'Where did I leave my charger?',
  'Where is my car parked?',
  'Where is my passport?',
  'Remember my keys are on the living room table',
];

export const LiveVoiceCallModal: React.FC<LiveVoiceCallModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
}) => {
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: `Hi! I'm your AfterMe ambient AI memory assistant. You're currently at ${currentLocation}. Speak naturally to store or retrieve anything!` }
  ]);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  // Scroll to bottom of conversation stream
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptHistory, currentThought]);

  const processUserQuery = async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return;

    // Interrupt AI speech if talking
    stopSpeaking();

    const userUtterance = queryText.trim();
    setTextInput('');
    setTranscriptHistory((prev) => [...prev, { sender: 'user', text: userUtterance }]);
    setIsProcessing(true);
    setCurrentThought('Retrieving verified memories with Google Gemini 2.5 Flash...');

    try {
      // Check if user is asking or stating a memory to save
      const lower = userUtterance.toLowerCase();
      if (lower.startsWith('remember') || lower.startsWith('i left') || lower.startsWith('i put') || lower.startsWith('parked')) {
        const createRes = await api.createMemory(userUtterance, currentLocation);
        const obj = createRes.extraction?.object || 'item';
        const loc = createRes.extraction?.location || currentLocation;
        const confirmAnswer = `Got it! I recorded that your ${obj} is at ${loc}.`;
        
        setCurrentThought(null);
        setTranscriptHistory((prev) => [...prev, { sender: 'ai', text: confirmAnswer }]);
        speak(confirmAnswer);
      } else {
        // Conversational Question Query
        const askRes = await api.askAfterMe(userUtterance, currentLocation);
        const answer = askRes.answer || "I checked your memories and couldn't find a matching record.";

        setCurrentThought(null);
        setTranscriptHistory((prev) => [...prev, { sender: 'ai', text: answer }]);
        speak(answer);
      }
    } catch (err) {
      console.warn('Voice call error:', err);
      const fallback = "I'm listening, but had trouble reaching the AI engine. Please speak or type again.";
      setCurrentThought(null);
      setTranscriptHistory((prev) => [...prev, { sender: 'ai', text: fallback }]);
      speak(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  const { isListening, isSupported, errorMessage: micError, toggleListening } = useSpeechToText((transcript) => {
    processUserQuery(transcript);
  });

  const handleStartCall = () => {
    const greeting = `Hello! I am AfterMe live voice. You are at ${currentLocation}. How can I help you?`;
    speak(greeting);
  };

  // Close & stop active audio
  const handleClose = () => {
    stopSpeaking();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ask-drawer-overlay" onClick={handleClose} style={{ zIndex: 3000 }}>
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          margin: 'auto',
          background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 60px rgba(99, 102, 241, 0.3)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'fadeIn 0.3s ease',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="location-pulse" style={{ background: '#10b981', width: '8px', height: '8px' }} />
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a5b4fc', fontWeight: 700 }}>
              Gemini 2.5 Live Voice Engine
            </span>
          </div>

          <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>
            📍 {currentLocation}
          </span>
        </div>

        {/* Ambient Glowing Voice Orb */}
        <div
          style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: isSpeaking
              ? 'radial-gradient(circle, #818cf8 0%, #4f46e5 60%, #312e81 100%)'
              : isListening
              ? 'radial-gradient(circle, #ef4444 0%, #dc2626 60%, #450a0a 100%)'
              : 'radial-gradient(circle, #38bdf8 0%, #0284c7 60%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isSpeaking
              ? '0 0 50px rgba(99, 102, 241, 0.9), inset 0 0 20px rgba(255,255,255,0.6)'
              : isListening
              ? '0 0 45px rgba(239, 68, 68, 0.8), inset 0 0 15px rgba(255,255,255,0.5)'
              : '0 0 35px rgba(56, 189, 248, 0.6), inset 0 0 15px rgba(255,255,255,0.4)',
            animation: isSpeaking || isListening ? 'pulse 1.2s infinite' : 'bounce 3s infinite ease-in-out',
            marginBottom: '16px',
            cursor: 'pointer',
          }}
          onClick={toggleListening}
          title={isListening ? 'Listening... Tap to stop' : 'Tap orb to start speaking'}
        >
          <Brain size={48} color="#ffffff" />
        </div>

        {/* Dynamic Voice Call Status */}
        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
          {isSpeaking ? '🔊 AfterMe is Speaking...' : isListening ? '🔴 Listening to your voice...' : isProcessing ? '⚡ Reasoning with Gemini...' : 'Ready for Voice'}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '14px' }}>
          Tap the microphone or say a question out loud!
        </div>

        {/* Mic Error Notice if permission blocked */}
        {micError && (
          <div
            style={{
              padding: '6px 12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.75rem',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} />
            <span>{micError}</span>
          </div>
        )}

        {/* Gemini Reasoning Bubble */}
        {currentThought && (
          <div
            style={{
              padding: '4px 12px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '16px',
              fontSize: '0.74rem',
              color: '#c7d2fe',
              marginBottom: '12px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {currentThought}
          </div>
        )}

        {/* Live Conversation Stream (Scrollable) */}
        <div
          ref={scrollRef}
          style={{
            width: '100%',
            height: '150px',
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.45)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: 'left',
            marginBottom: '14px',
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {transcriptHistory.map((item, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
                background: item.sender === 'user' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255,255,255,0.08)',
                color: '#ffffff',
                padding: '8px 12px',
                borderRadius: '12px',
                maxWidth: '85%',
                lineHeight: 1.4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <strong style={{ fontSize: '0.7rem', color: item.sender === 'user' ? '#c7d2fe' : '#38bdf8', display: 'block', marginBottom: '2px' }}>
                {item.sender === 'user' ? 'You' : 'AfterMe Voice'}:
              </strong>
              {item.text}
            </div>
          ))}
        </div>

        {/* Quick Question Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '14px', width: '100%' }}>
          {QUICK_CALL_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="example-chip"
              onClick={() => processUserQuery(q)}
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            >
              "{q}"
            </button>
          ))}
        </div>

        {/* Text Input Fallback Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            processUserQuery(textInput);
          }}
          style={{ display: 'flex', gap: '6px', width: '100%', marginBottom: '16px' }}
        >
          <input
            type="text"
            placeholder="Type or speak any question or memory..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="capture-input"
            style={{ padding: '8px 12px', fontSize: '0.8rem', flex: 1 }}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!textInput.trim() || isProcessing}
            style={{ padding: '8px 14px' }}
          >
            <Send size={13} />
          </button>
        </form>

        {/* Live Call Control Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
            onClick={toggleListening}
            title={isListening ? 'Click to stop listening' : 'Click to start microphone'}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              background: isListening ? '#ef4444' : undefined,
              borderColor: isListening ? '#ef4444' : undefined,
            }}
          >
            {isListening ? <MicOff size={22} color="#ffffff" /> : <Mic size={22} color="#38bdf8" />}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleClose}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              boxShadow: '0 0 25px rgba(239, 68, 68, 0.8)',
            }}
            title="End Live Voice Call"
          >
            <PhoneOff size={26} color="#ffffff" />
          </button>
        </div>
      </div>
    </div>
  );
};
