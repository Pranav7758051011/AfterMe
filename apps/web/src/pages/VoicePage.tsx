import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Sparkles,
  Brain, Send, Square, User
} from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { api } from '../services/api';

interface VoicePageProps {
  currentLocation: string;
}

const QUICK_QUESTIONS = [
  'Where did I leave my charger?',
  'Where is my car parked?',
  'Where is my passport?',
  'Remember: my keys are on the living room table',
];

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export const VoicePage: React.FC<VoicePageProps> = ({ currentLocation }) => {
  const [history, setHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: `Hi! I'm your AfterMe live voice assistant. You're at ${currentLocation}. Speak naturally to store or retrieve anything.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [thinkingText, setThinkingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();
  const { isListening, isSupported, toggleListening } = useSpeechToText(transcript => {
    setTextInput(prev => prev ? `${prev} ${transcript}` : transcript);
  });

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, thinkingText]);

  useEffect(() => {
    setVoiceState(isSpeaking ? 'speaking' : isListening ? 'listening' : voiceState === 'processing' ? 'processing' : 'idle');
  }, [isSpeaking, isListening]);

  const processQuery = async (queryText: string) => {
    if (!queryText.trim() || voiceState === 'processing') return;
    stopSpeaking();

    const utterance = queryText.trim();
    setTextInput('');
    setHistory(prev => [...prev, { sender: 'user', text: utterance, time: now() }]);
    setVoiceState('processing');
    setThinkingText('Reasoning with Gemini…');

    try {
      const lower = utterance.toLowerCase();
      let answer: string;

      if (lower.startsWith('remember') || lower.startsWith('i left') || lower.startsWith('i put') || lower.startsWith('parked')) {
        const res = await api.createMemory(utterance, currentLocation);
        const obj = res.extraction?.object || 'item';
        const loc = res.extraction?.location || currentLocation;
        answer = `Got it! I've recorded that your ${obj} is at ${loc}.`;
      } else {
        const res = await api.askAfterMe(utterance, currentLocation);
        answer = res.answer || "I checked your memories but couldn't find a matching record.";
      }

      setThinkingText('');
      setHistory(prev => [...prev, { sender: 'ai', text: answer, time: now() }]);
      speak(answer);
    } catch {
      const fallback = "I'm listening, but had trouble reaching the AI engine. Please try again.";
      setThinkingText('');
      setHistory(prev => [...prev, { sender: 'ai', text: fallback, time: now() }]);
      speak(fallback);
    } finally {
      setVoiceState('idle');
    }
  };

  const handleMicClick = async () => {
    if (isListening && textInput.trim()) {
      toggleListening();
      await processQuery(textInput);
    } else {
      toggleListening();
    }
  };

  const ORB_LABELS: Record<VoiceState, string> = {
    idle:       'READY',
    listening:  'LISTENING',
    processing: 'THINKING',
    speaking:   'SPEAKING',
  };

  const ORB_COLORS: Record<VoiceState, string> = {
    idle:       'var(--accent)',
    listening:  'var(--danger)',
    processing: 'var(--warning)',
    speaking:   'var(--success)',
  };

  return (
    <div style={{ animation: 'fadeUp 0.3s var(--ease-out)', maxWidth: 720, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>
          Live Voice Mode
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
          Speak to store or retrieve memories using Gemini AI
        </p>
      </div>

      {/* Layout: Orb + Chat */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>
        {/* Left: Voice Orb Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-5)' }}>
          {/* Orb */}
          <div
            className="voice-orb-container"
            onClick={handleMicClick}
            style={{ cursor: 'pointer' }}
          >
            {/* Outer rings */}
            {(voiceState === 'listening' || voiceState === 'speaking') && (
              <>
                <div style={{ position: 'absolute', width: '170px', height: '170px', borderRadius: '50%', border: `1px solid ${ORB_COLORS[voiceState]}30`, animation: 'radarPulse 2s ease-out infinite' }} />
                <div style={{ position: 'absolute', width: '170px', height: '170px', borderRadius: '50%', border: `1px solid ${ORB_COLORS[voiceState]}20`, animation: 'radarPulse 2s ease-out infinite 0.6s' }} />
              </>
            )}
            <div
              className={`voice-orb ${voiceState}`}
              style={{
                background: `radial-gradient(circle at 35% 35%, color-mix(in srgb, ${ORB_COLORS[voiceState]} 40%, #fff), ${ORB_COLORS[voiceState]})`,
                boxShadow: `0 0 0 12px ${ORB_COLORS[voiceState]}15, 0 0 0 24px ${ORB_COLORS[voiceState]}08, 0 8px 32px ${ORB_COLORS[voiceState]}40`,
              }}
            >
              {voiceState === 'processing' ? (
                <div className="live-dot" style={{ width: 12, height: 12 }} />
              ) : voiceState === 'speaking' ? (
                <Volume2 size={32} color="#fff" />
              ) : isListening ? (
                <Mic size={32} color="#fff" />
              ) : (
                <Mic size={28} color="#fff" />
              )}
            </div>
          </div>

          {/* Status Label */}
          <div
            className="voice-status-label"
            style={{
              color: ORB_COLORS[voiceState],
              borderColor: `${ORB_COLORS[voiceState]}30`,
              background: `${ORB_COLORS[voiceState]}10`,
            }}
          >
            {ORB_LABELS[voiceState]}
          </div>

          {/* Location Badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 4 }}>AT LOCATION</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
              <span>📍</span>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLocation}</span>
            </div>
          </div>

          {/* Stop TTS Button */}
          {isSpeaking && (
            <button
              type="button"
              className="btn btn-destructive btn-sm"
              onClick={stopSpeaking}
              style={{ fontSize: '0.78rem' }}
            >
              <Square size={12} />
              Stop Voice
            </button>
          )}

          {/* Quick questions */}
          <div style={{ width: '100%' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 'var(--sp-2)', textAlign: 'center' }}>
              QUICK ASK
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  className="sample-question"
                  onClick={() => processQuery(q)}
                  disabled={voiceState === 'processing'}
                  style={{ fontSize: '0.75rem', padding: 'var(--sp-2) var(--sp-3)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Chat Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {/* Transcript */}
          <div
            ref={scrollRef}
            style={{
              height: 380,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-3)',
              padding: 'var(--sp-4)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--r-lg)',
            }}
          >
            {history.map((msg, i) => (
              <div
                key={i}
                className={`chat-msg ${msg.sender === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}
              >
                {msg.sender === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, fontSize: '0.7rem', color: 'var(--accent)' }}>
                    <Brain size={11} />
                    <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>AfterMe AI</span>
                  </div>
                )}
                <div className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                  {msg.text}
                </div>
                <div className="chat-time">{msg.time}</div>
              </div>
            ))}

            {thinkingText && (
              <div className="chat-msg chat-msg-ai">
                <div className="chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{thinkingText}</span>
                </div>
              </div>
            )}
          </div>

          {/* Text Input Row */}
          <form
            onSubmit={e => { e.preventDefault(); processQuery(textInput); }}
            style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}
          >
            {isSupported && (
              <button
                type="button"
                className={`mic-btn${isListening ? ' recording' : ''}`}
                onClick={handleMicClick}
                style={{ flexShrink: 0 }}
              >
                {isListening ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Mic size={16} />
                    <div className="soundwave-visualizer">
                      <span className="soundwave-bar" /><span className="soundwave-bar" /><span className="soundwave-bar" />
                    </div>
                  </div>
                ) : (
                  <MicOff size={16} />
                )}
              </button>
            )}

            <input
              type="text"
              className="form-input"
              placeholder='Speak or type: "Where is my passport?"'
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              disabled={voiceState === 'processing'}
              style={{ flex: 1 }}
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={voiceState === 'processing' || !textInput.trim()}
              style={{ padding: '10px 14px', flexShrink: 0 }}
            >
              <Send size={15} />
            </button>
          </form>

          {isListening && (
            <div style={{
              padding: '6px 12px',
              background: 'var(--danger-subtle)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--danger-text)',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}>
              <div className="live-dot" style={{ background: 'var(--danger-text)' }} />
              Mic active — speak now, then tap mic to send
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
