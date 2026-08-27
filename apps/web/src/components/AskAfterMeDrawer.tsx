import React, { useState, useRef, useEffect } from 'react';
import {
  X, MessageSquareQuote, Send, Sparkles, ShieldCheck,
  MapPin, CheckCircle2, Mic, MicOff, BookOpen, Target,
  Volume2, VolumeX, Square, Brain
} from 'lucide-react';
import { AskResponse, Memory } from '../types';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { KNOWN_PLACES } from './LocationSimulator';

interface AskAfterMeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAsk: (question: string) => Promise<AskResponse>;
  currentLocation: string;
  onLocateOnMap?: (location: { lat: number; lng: number; name: string; label?: string; memoryId?: string }) => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  relevantMemories?: Memory[];
  hasMatch?: boolean;
  confidence?: number;
  hint?: string;
  timestamp: string;
}

const SAMPLE_QUESTIONS = [
  'Where did I leave my charger?',
  'Where is my passport?',
  'Where is my car parked?',
  'What tasks do I have due this week?',
  'Did I leave anything in the library?',
];

export const AskAfterMeDrawer: React.FC<AskAfterMeDrawerProps> = ({
  isOpen,
  onClose,
  onAsk,
  currentLocation,
  onLocateOnMap,
}) => {
  const [question, setQuestion] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your AfterMe memory assistant. Ask me anything about items you stored, things you left behind, tasks you noted, or commitments you made.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const tts = useTextToSpeech();
  const { isListening, isSupported: isSttSupported, toggleListening } = useSpeechToText(transcript => {
    setQuestion(prev => prev ? `${prev} ${transcript}` : transcript);
  });

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  if (!isOpen) return null;

  const triggerLocateOnMap = (memory: Memory) => {
    let lat = memory.latitude;
    let lng = memory.longitude;
    const name = memory.location || 'Saved Location';

    if ((lat == null) && memory.location) {
      const match = KNOWN_PLACES.find(p => memory.location?.toLowerCase().includes(p.name.toLowerCase()));
      lat = match ? match.lat : 37.7749;
      lng = match ? match.lng : -122.4194;
    }

    if (lat != null && lng != null && onLocateOnMap) {
      onLocateOnMap({ lat, lng, name, label: memory.object || memory.task || memory.original_text, memoryId: memory.id });
    }
  };

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSend = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim() || isAsking) return;

    const userMsg: MessageItem = { id: `user-${Date.now()}`, sender: 'user', text: q.trim(), timestamp: now() };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setIsAsking(true);

    try {
      const res = await onAsk(q.trim());
      const aiMsg: MessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        relevantMemories: res.relevant_memories,
        hasMatch: res.has_match,
        confidence: res.confidence,
        hint: res.follow_up_hint,
        timestamp: now(),
      };
      setMessages(prev => [...prev, aiMsg]);

      if (autoSpeak) tts.speak(res.answer);
      if (res.has_match && res.relevant_memories?.length > 0) {
        triggerLocateOnMap(res.relevant_memories[0]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'I ran into an issue searching memories. Please try again.',
        hasMatch: false,
        timestamp: now(),
      }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="ask-drawer-overlay" onClick={onClose}>
      <div className="ask-drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title">
            <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={17} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ask AfterMe</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
                GROUNDED · ZERO HALLUCINATION
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${autoSpeak ? 'btn-success' : ''}`}
              onClick={() => { if (tts.isSpeaking) tts.stop(); setAutoSpeak(!autoSpeak); }}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              {autoSpeak ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>{autoSpeak ? 'Voice' : 'Muted'}</span>
            </button>
            <button type="button" className="btn btn-ghost btn-icon-sm" onClick={() => { tts.stop(); onClose(); }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="drawer-body" ref={bodyRef}>
          {messages.map(m => (
            <div key={m.id} className={`chat-msg ${m.sender === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
              {m.sender === 'ai' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: '0.72rem', color: 'var(--accent)' }}>
                  <Sparkles size={11} />
                  <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>AfterMe AI</span>
                  {m.hasMatch !== undefined && (
                    <span
                      className={`badge ${m.hasMatch ? 'badge-success' : 'badge-low'}`}
                      style={{ marginLeft: 'auto', fontSize: '0.65rem' }}
                    >
                      {m.hasMatch ? '✓ Verified' : 'No match'}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => tts.isSpeaking ? tts.stop() : tts.speak(m.text)}
                    title="Read aloud"
                    style={{ color: 'var(--text-tertiary)', width: 20, height: 20 }}
                  >
                    {tts.isSpeaking ? <Square size={10} /> : <Volume2 size={11} />}
                  </button>
                </div>
              )}

              <div className={m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                {/* Citations */}
                {m.relevantMemories && m.relevantMemories.length > 0 && (
                  <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--sp-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 'var(--sp-2)' }}>
                      <BookOpen size={11} />
                      <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>SOURCE MEMORIES</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {m.relevantMemories.map(mem => (
                        <div key={mem.id} className="citation-card">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {mem.object || mem.task || mem.original_text.slice(0, 40)}
                            </div>
                            {mem.location && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                <MapPin size={10} />
                                <span>{mem.location}</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-success btn-xs"
                            onClick={() => triggerLocateOnMap(mem)}
                          >
                            <Target size={11} />
                            Map
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {m.hint && (
                  <div style={{ marginTop: 'var(--sp-3)', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                    💡 {m.hint}
                  </div>
                )}
              </div>
              <div className="chat-time">{m.timestamp}</div>
            </div>
          ))}

          {isAsking && (
            <div className="chat-msg chat-msg-ai">
              <div className="chat-bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="live-dot" />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Searching memories…</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions */}
        <div style={{ padding: '0 var(--sp-6) var(--sp-3)', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {SAMPLE_QUESTIONS.map((sq, i) => (
            <button
              key={i}
              type="button"
              className="example-chip"
              onClick={() => handleSend(sq)}
              disabled={isAsking}
              style={{ fontSize: '0.75rem', flexShrink: 0 }}
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Footer Input */}
        <div className="drawer-footer">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {isSttSupported && (
              <button
                type="button"
                className={`mic-btn${isListening ? ' recording' : ''}`}
                onClick={toggleListening}
                style={{ flexShrink: 0 }}
              >
                {isListening ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Mic size={16} />
                    <div className="soundwave-visualizer">
                      <span className="soundwave-bar" /><span className="soundwave-bar" /><span className="soundwave-bar" />
                    </div>
                  </div>
                ) : <MicOff size={16} />}
              </button>
            )}

            <input
              type="text"
              className="form-input"
              placeholder="Where did I leave my…"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              disabled={isAsking}
              style={{ flex: 1 }}
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isAsking || !question.trim()}
              style={{ padding: '10px 14px', flexShrink: 0 }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
