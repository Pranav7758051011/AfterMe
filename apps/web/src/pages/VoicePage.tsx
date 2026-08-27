import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, 
  Brain, MessageSquare, Radio, CheckCircle2, Send, AlertCircle, Bot, User 
} from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { api } from '../services/api';

interface VoicePageProps {
  currentLocation: string;
}

const QUICK_CALL_QUESTIONS = [
  'Where did I leave my charger?',
  'Where is my car parked?',
  'Where is my passport?',
  'Remember my keys are on the living room table',
];

export const VoicePage: React.FC<VoicePageProps> = ({ currentLocation }) => {
  const [transcriptHistory, setTranscriptHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: `Hi! I'm your AfterMe live voice assistant. You are currently at ${currentLocation}. Speak naturally to store or retrieve anything!` }
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
    setCurrentThought('Reasoning with Google Gemini 2.5 Flash...');

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

  return (
    <div
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        animation: 'fadeIn 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Header Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isListening ? 'rgba(78, 222, 163, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            border: isListening ? '1px solid #4edea3' : '1px solid rgba(99, 102, 241, 0.4)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: isListening ? '#4edea3' : '#c0c1ff',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isListening ? '#4edea3' : '#c0c1ff' }} className="animate-pulse" />
          <span>GEMINI 2.0 LIVE VOICE &bull; 📍 {currentLocation}</span>
        </span>
      </div>

      {/* Central Stitch AI Ambient Glowing Voice Orb */}
      <div style={{ position: 'relative', width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0 28px' }}>
        {/* Animated Ripple Rings */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(78, 222, 163, 0.4)',
            boxShadow: '0 0 20px rgba(78, 222, 163, 0.2)',
            animation: isListening ? 'micPulseGlow 2s infinite ease-in-out' : undefined,
          }}
        />

        {/* Central Orb */}
        <div
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: isSpeaking
              ? 'radial-gradient(circle at 30% 30%, #c0c1ff 0%, #8083ff 60%, #494bd6 100%)'
              : isListening
              ? 'radial-gradient(circle at 30% 30%, #6ffbbe 0%, #00885d 60%, #003824 100%)'
              : 'radial-gradient(circle at 30% 30%, #c0c1ff 0%, #8083ff 60%, #121826 100%)',
            boxShadow: isSpeaking
              ? '0 0 60px rgba(192, 193, 255, 0.5), inset 0 0 30px rgba(255,255,255,0.4)'
              : isListening
              ? '0 0 50px rgba(78, 222, 163, 0.6), inset 0 0 30px rgba(255,255,255,0.4)'
              : '0 0 40px rgba(192, 193, 255, 0.3), inset 0 0 20px rgba(255,255,255,0.3)',
            animation: isSpeaking || isListening ? 'pulse 1.3s infinite ease-in-out' : 'bounce 3s infinite ease-in-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
          onClick={toggleListening}
          title={isListening ? 'Click to Mute' : 'Click to Speak'}
        >
          <Brain size={56} color="#ffffff" />
        </div>
      </div>

      {/* Dynamic Status Text */}
      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c0c1ff', marginBottom: '6px' }}>
        {isSpeaking ? 'AfterMe Voice Speaking...' : isListening ? 'Gemini 2.0 Listening...' : isProcessing ? 'Reasoning with Gemini...' : 'Ready for Voice'}
      </h2>
      <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '480px', marginBottom: '24px' }}>
        Speak naturally. I analyze spatial context from your recent memories and GPS location.
      </p>

      {/* Mic Error Notice */}
      {micError && (
        <div
          style={{
            padding: '8px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            color: '#f87171',
            fontSize: '0.8rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{micError}</span>
        </div>
      )}

      {/* Gemini Reasoning Bubble */}
      {currentThought && (
        <div
          style={{
            padding: '6px 16px',
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '20px',
            fontSize: '0.78rem',
            color: '#c7d2fe',
            marginBottom: '16px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {currentThought}
        </div>
      )}

      {/* Stitch AI Transcript Box */}
      <div
        ref={scrollRef}
        style={{
          width: '100%',
          maxHeight: '180px',
          overflowY: 'auto',
          background: 'rgba(18, 24, 38, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'left',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {transcriptHistory.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              justifyContent: item.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {item.sender === 'ai' && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(128, 131, 255, 0.2)',
                  border: '1px solid rgba(128, 131, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Brain size={16} color="#c0c1ff" />
              </div>
            )}

            <div
              style={{
                background: item.sender === 'user' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'rgba(255, 255, 255, 0.06)',
                padding: '10px 14px',
                borderRadius: '14px',
                maxWidth: '80%',
                fontSize: '0.86rem',
                color: '#ffffff',
                lineHeight: 1.4,
              }}
            >
              <span style={{ display: 'block', fontSize: '0.68rem', color: item.sender === 'user' ? '#c7d2fe' : '#7bd0ff', fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono' }}>
                {item.sender === 'user' ? 'USER' : 'AI'}
              </span>
              {item.text}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Question Suggestion Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px', width: '100%' }}>
        {QUICK_CALL_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            className="example-chip"
            onClick={() => processUserQuery(q)}
            style={{ fontSize: '0.76rem', padding: '4px 10px' }}
          >
            "{q}"
          </button>
        ))}
      </div>

      {/* Controls Area (Equalizer + Mute FAB + Text Fallback) */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(18, 24, 38, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '50px',
          padding: '8px 14px',
          gap: '12px',
        }}
      >
        {/* Text Input Fallback inside bar */}
        <input
          type="text"
          placeholder="Type or speak a question..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              processUserQuery(textInput);
            }
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />

        {/* Stitch AI Live Equalizer Soundwave */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '24px', gap: '3px' }}>
          <span className="soundwave-bar" style={{ background: isListening ? '#4edea3' : '#94a3b8' }} />
          <span className="soundwave-bar" style={{ background: isListening ? '#4edea3' : '#94a3b8' }} />
          <span className="soundwave-bar" style={{ background: isListening ? '#4edea3' : '#94a3b8' }} />
          <span className="soundwave-bar" style={{ background: isListening ? '#4edea3' : '#94a3b8' }} />
          <span className="soundwave-bar" style={{ background: isListening ? '#4edea3' : '#94a3b8' }} />
        </div>

        {/* Main Microphone Action FAB */}
        <button
          type="button"
          className={`btn ${isListening ? 'mic-unmuted-glow' : 'mic-muted-glow'}`}
          onClick={toggleListening}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          title={isListening ? 'Click to Mute' : 'Click to Unmute & Speak'}
        >
          {isListening ? <Mic size={22} color="#ffffff" /> : <MicOff size={22} color="#f87171" />}
        </button>
      </div>
    </div>
  );
};
