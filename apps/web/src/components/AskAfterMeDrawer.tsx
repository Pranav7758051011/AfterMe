import React, { useState } from 'react';
import { 
  X, MessageSquareQuote, Send, Sparkles, ShieldCheck, 
  MapPin, CheckCircle2, AlertCircle, Mic, MicOff, BookOpen, Target,
  Volume2, VolumeX, Square
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
}

const SAMPLE_QUESTIONS = [
  'Where did I leave my charger?',
  'Where is my passport? I need it tomorrow.',
  'Where is my car parked?',
  'What tasks do I have due this week?',
  'Did I leave anything in the library?',
  'Where are my keys? (Anti-hallucination test)',
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
    },
  ]);
  const [isAsking, setIsAsking] = useState(false);

  const tts = useTextToSpeech();

  const { isListening, isSupported: isSttSupported, toggleListening } = useSpeechToText((transcript) => {
    setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
  });

  if (!isOpen) return null;

  const triggerLocateOnMap = (memory: Memory) => {
    let lat = memory.latitude;
    let lng = memory.longitude;
    const name = memory.location || 'Saved Location';

    if ((lat === null || lat === undefined) && memory.location) {
      const match = KNOWN_PLACES.find((p) => memory.location?.toLowerCase().includes(p.name.toLowerCase()));
      if (match) {
        lat = match.lat;
        lng = match.lng;
      } else {
        lat = 37.7749;
        lng = -122.4194;
      }
    }

    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined && onLocateOnMap) {
      onLocateOnMap({
        lat,
        lng,
        name,
        label: memory.object || memory.task || memory.original_text,
        memoryId: memory.id,
      });
    }
  };

  const handleSend = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim() || isAsking) return;

    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
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
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Speak response aloud if autoSpeak is ON
      if (autoSpeak) {
        tts.speak(res.answer);
      }

      // Automatically circle the location on the map if verified memory is found!
      if (res.has_match && res.relevant_memories && res.relevant_memories.length > 0) {
        triggerLocateOnMap(res.relevant_memories[0]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'I ran into an issue searching memories. Please try again.',
          hasMatch: false,
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="ask-drawer-overlay" onClick={onClose}>
      <div className="ask-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="logo-badge" style={{ width: '32px', height: '32px' }}>
              <MessageSquareQuote size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Ask AfterMe</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Grounded conversational retrieval &bull; Zero hallucinations
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Auto-Speak Toggle */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (tts.isSpeaking) tts.stop();
                setAutoSpeak(!autoSpeak);
              }}
              title={autoSpeak ? 'Voice Response Enabled (Click to Mute)' : 'Voice Response Muted'}
              style={{
                padding: '4px 8px',
                fontSize: '0.72rem',
                color: autoSpeak ? '#34d399' : 'var(--text-muted)',
                borderColor: autoSpeak ? 'rgba(16, 185, 129, 0.4)' : undefined,
              }}
            >
              {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>{autoSpeak ? 'Voice ON' : 'Muted'}</span>
            </button>

            <button className="btn btn-secondary btn-icon" onClick={() => { tts.stop(); onClose(); }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="drawer-body">
          {messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className={m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                {m.sender === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    <Sparkles size={12} />
                    <span>AfterMe Memory Engine</span>
                    
                    {/* Read Aloud Button */}
                    <button
                      type="button"
                      onClick={() => (tts.isSpeaking ? tts.stop() : tts.speak(m.text))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                      title="Read aloud"
                    >
                      {tts.isSpeaking ? <Square size={11} color="#f87171" /> : <Volume2 size={12} />}
                      <span style={{ fontSize: '0.7rem' }}>{tts.isSpeaking ? 'Stop' : 'Listen'}</span>
                    </button>

                    {m.hasMatch !== undefined && (
                      <span
                        className="badge"
                        style={{
                          marginLeft: 'auto',
                          background: m.hasMatch ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.15)',
                          color: m.hasMatch ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {m.hasMatch ? '✓ Verified Memory' : 'Strict No-Hallucination'}
                      </span>
                    )}
                  </div>
                )}
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

                {/* Relevant cited memory snippets */}
                {m.relevantMemories && m.relevantMemories.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BookOpen size={12} />
                      <span>Cited Memories:</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {m.relevantMemories.map((mem) => (
                        <div
                          key={mem.id}
                          style={{
                            padding: '10px 12px',
                            background: 'rgba(0,0,0,0.28)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong>{mem.object || mem.task || mem.original_text.slice(0, 30)}</strong>
                            {mem.location && (
                              <span style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                <MapPin size={12} />
                                {mem.location}
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '8px' }}>
                            "{mem.original_text}"
                          </div>

                          {/* 1-Click Circle on Map Button */}
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => triggerLocateOnMap(mem)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            <Target size={12} />
                            <span>🎯 Circle Area on Map</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="chat-bubble-ai" style={{ width: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="location-pulse" style={{ width: '8px', height: '8px' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Searching memories...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ padding: '0 24px', display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px' }}>
          {SAMPLE_QUESTIONS.map((sq, idx) => (
            <button
              key={idx}
              type="button"
              className="example-chip"
              onClick={() => handleSend(sq)}
              disabled={isAsking}
              style={{ fontSize: '0.75rem' }}
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Drawer Footer Input */}
        <div className="drawer-footer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            {isSttSupported && (
              <button
                type="button"
                className={`mic-btn ${isListening ? 'recording mic-unmuted-glow' : 'mic-muted-glow'}`}
                onClick={toggleListening}
                title={isListening ? '🎙️ Mic Active (Unmuted) — Click to Mute / Send' : '🔇 Mic Muted — Click to Unmute & Speak'}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: isListening ? '0 12px' : undefined }}
              >
                {isListening ? (
                  <>
                    <Mic size={18} color="#ffffff" />
                    <div className="soundwave-visualizer">
                      <span className="soundwave-bar" />
                      <span className="soundwave-bar" />
                      <span className="soundwave-bar" />
                    </div>
                  </>
                ) : (
                  <MicOff size={18} color="#f87171" />
                )}
              </button>
            )}

            <input
              type="text"
              className="capture-input"
              style={{ padding: '12px 14px', fontSize: '0.92rem' }}
              placeholder='Ask AfterMe: "Where did I leave my charger?"'
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isAsking}
            />

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isAsking || !question.trim()}
              style={{ padding: '12px 16px' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
