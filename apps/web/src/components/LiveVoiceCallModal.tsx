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
    { sender: 'ai', text: `Hi! I'm your AfterMe live voice assistant. You're at ${currentLocation}. Speak naturally to store or retrieve any memory!` }
  ]);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  // Auto-scroll conversation
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
          background: 'radial-gradient(circle at 50% 15%, #1e1b4b 0%, #090d16 100%)',
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="location-pulse" style={{ background: isListening ? '#10b981' : '#f59e0b', width: '8px', height: '8px' }} />
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a5b4fc', fontWeight: 700 }}>
              Gemini 2.5 Live Voice Engine
            </span>
          </div>

          <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
            📍 {currentLocation}
          </span>
        </div>

        {/* Ambient Glowing Voice Orb with Interactive Animation */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0 16px' }}>
          {/* Outer Ripple Wave when listening / unmuted */}
          {isListening && (
            <div
              style={{
                position: 'absolute',
                width: '170px',
                height: '170px',
                borderRadius: '50%',
                border: '2px solid rgba(16, 185, 129, 0.6)',
                animation: 'micPulseGlow 1.2s infinite ease-in-out',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Core Voice Orb */}
          <div
            style={{
              position: 'relative',
              width: '124px',
              height: '124px',
              borderRadius: '50%',
              background: isSpeaking
                ? 'radial-gradient(circle, #818cf8 0%, #4f46e5 60%, #312e81 100%)'
                : isListening
                ? 'radial-gradient(circle, #34d399 0%, #059669 60%, #064e3b 100%)'
                : 'radial-gradient(circle, #38bdf8 0%, #0284c7 60%, #0f172a 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isSpeaking
                ? '0 0 50px rgba(99, 102, 241, 0.9), inset 0 0 20px rgba(255,255,255,0.6)'
                : isListening
                ? '0 0 45px rgba(16, 185, 129, 0.9), inset 0 0 20px rgba(255,255,255,0.6)'
                : '0 0 30px rgba(56, 189, 248, 0.5), inset 0 0 15px rgba(255,255,255,0.3)',
              animation: isSpeaking || isListening ? 'pulse 1.3s infinite ease-in-out' : 'bounce 3s infinite ease-in-out',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onClick={toggleListening}
            title={isListening ? '🎙️ Mic Active (Unmuted) — Click to Mute' : '🔇 Mic Muted — Click Orb to Unmute & Speak'}
          >
            <Brain size={44} color="#ffffff" />
            
            {/* Live Equalizer Soundwave inside Orb when Unmuted */}
            {isListening && (
              <div className="soundwave-visualizer" style={{ marginTop: '4px' }}>
                <span className="soundwave-bar" style={{ background: '#ffffff' }} />
                <span className="soundwave-bar" style={{ background: '#ffffff' }} />
                <span className="soundwave-bar" style={{ background: '#ffffff' }} />
                <span className="soundwave-bar" style={{ background: '#ffffff' }} />
                <span className="soundwave-bar" style={{ background: '#ffffff' }} />
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Voice Call Status Badge */}
        <div style={{ marginBottom: '14px' }}>
          {isSpeaking ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.2)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.5)' }}>
              <Volume2 size={16} color="#818cf8" />
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>AfterMe Voice Speaking...</span>
            </div>
          ) : isListening ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.2)', padding: '6px 14px', borderRadius: '20px', border: '1px solid #10b981' }}>
              <div className="soundwave-visualizer">
                <span className="soundwave-bar" />
                <span className="soundwave-bar" />
                <span className="soundwave-bar" />
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#34d399' }}>Microphone UNMUTED (Listening...)</span>
            </div>
          ) : isProcessing ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(56, 189, 248, 0.2)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.5)' }}>
              <Sparkles size={16} color="#38bdf8" />
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8' }}>Reasoning with Gemini 2.5 Flash...</span>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.15)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              <MicOff size={16} color="#f87171" />
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fca5a5' }}>Microphone MUTED &bull; Click to Speak</span>
            </div>
          )}
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
            height: '140px',
            overflowY: 'auto',
            background: 'rgba(0, 0, 0, 0.45)',
            borderRadius: '14px',
            padding: '12px 14px',
            textAlign: 'left',
            marginBottom: '12px',
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '12px', width: '100%' }}>
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

        {/* Live Call Bottom Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Animated Microphone Toggle Button */}
          <button
            type="button"
            className={`btn ${isListening ? 'mic-unmuted-glow' : 'mic-muted-glow'}`}
            onClick={toggleListening}
            title={isListening ? '🎙️ Mic Active (Unmuted) — Click to Mute' : '🔇 Mic Muted — Click to Unmute & Speak'}
            style={{
              width: isListening ? 'auto' : '52px',
              height: '52px',
              borderRadius: isListening ? '26px' : '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isListening ? '0 16px' : 0,
              gap: '6px',
            }}
          >
            {isListening ? (
              <>
                <Mic size={22} color="#ffffff" />
                <div className="soundwave-visualizer">
                  <span className="soundwave-bar" style={{ background: '#ffffff' }} />
                  <span className="soundwave-bar" style={{ background: '#ffffff' }} />
                  <span className="soundwave-bar" style={{ background: '#ffffff' }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Mute</span>
              </>
            ) : (
              <MicOff size={22} color="#f87171" />
            )}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleClose}
            style={{
              width: '56px',
              height: '56px',
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
            <PhoneOff size={24} color="#ffffff" />
          </button>
        </div>
      </div>
    </div>
  );
};
