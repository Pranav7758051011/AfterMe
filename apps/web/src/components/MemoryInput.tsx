import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Mic, MicOff, Send, CheckCircle2, ShieldAlert, 
  Camera, Video, Image as ImageIcon, X, Car, Film, AlertCircle 
} from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { MediaCaptureModal } from './MediaCaptureModal';

interface MemoryInputProps {
  onSave: (text: string, options?: { imageUrl?: string; imageBase64?: string; latitude?: number; longitude?: number }) => Promise<{ memory: any; extraction: any }>;
  currentLocation: string;
  userLatitude?: number;
  userLongitude?: number;
  prefilledText?: string;
}

const EXAMPLE_PROMPTS = [
  'I left my black laptop charger in the conference room.',
  'My passport is in the blue folder in the top desk drawer.',
  'Parked my car on Floor 2, Bay B-14.',
  'I need to send the project report to Professor Davis by Friday.',
  'I left my AirPods on the 2nd floor library study table.',
];

export const MemoryInput: React.FC<MemoryInputProps> = ({ onSave, currentLocation, userLatitude, userLongitude, prefilledText }) => {
  const [text, setText] = useState(prefilledText || '');
  const [attachedMedia, setAttachedMedia] = useState<{ type: 'image' | 'video'; base64: string; mimeType: string } | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefilledText !== undefined && prefilledText !== null) {
      setText(prefilledText);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [prefilledText]);

  const { isListening, isSupported, errorMessage: micError, toggleListening } = useSpeechToText((transcript) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  });

  const handleQuickParkCar = () => {
    setText(`Parked my vehicle at ${currentLocation}`);
  };

  const handleMediaCaptured = (media: { type: 'image' | 'video'; base64: string; mimeType: string }) => {
    setAttachedMedia(media);
    if (!text.trim()) {
      setText(media.type === 'video' ? `Recorded video memory at ${currentLocation}` : `Stored photo memory at ${currentLocation}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !attachedMedia) || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const promptText = text.trim() || (attachedMedia ? `Saved ${attachedMedia.type} at ${currentLocation}` : '');
      const res = await onSave(promptText, {
        imageBase64: attachedMedia?.base64,
        imageUrl: attachedMedia?.type === 'video' ? attachedMedia.base64 : undefined,
        latitude: userLatitude,
        longitude: userLongitude,
      });

      setLastExtraction(res.extraction);
      setText('');
      setAttachedMedia(null);

      // Auto-hide feedback after 6s
      setTimeout(() => setLastExtraction(null), 6000);
    } catch (err) {
      console.error('Error saving memory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChipClick = (promptText: string) => {
    setText(promptText);
  };

  return (
    <div className="capture-card" id="memory-input-section">
      <div className="capture-label">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--accent-primary)" />
          <span>What should I remember?</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleQuickParkCar}
            title="1-Click Car Parking Memory"
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
          >
            <Car size={13} />
            <span>Parked Car Here</span>
          </button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Gemini Multimodal AI
          </span>
        </div>
      </div>

      {/* Mic Permission / Error Banner */}
      {micError && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '8px',
            color: '#fbbf24',
            fontSize: '0.78rem',
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

      {/* Attached Media Thumbnail Preview (Photo or Video) */}
      {attachedMedia && (
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px' }}>
          {attachedMedia.type === 'video' ? (
            <div
              style={{
                width: '120px',
                height: '80px',
                borderRadius: '10px',
                border: '2px solid var(--accent-primary)',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <video src={attachedMedia.base64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <Film size={20} color="#fff" style={{ position: 'absolute' }} />
            </div>
          ) : (
            <img
              src={attachedMedia.base64}
              alt="Memory attachment"
              style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '2px solid var(--accent-primary)' }}
            />
          )}

          <button
            type="button"
            onClick={() => setAttachedMedia(null)}
            title="Remove attachment"
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="capture-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="capture-input"
            placeholder='e.g. "I left my black laptop charger in the conference room..."'
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />

          <div className="capture-btn-group">
            {/* Live Camera / Video Capture Modal Trigger */}
            <button
              type="button"
              className="btn btn-secondary btn-icon btn-sm"
              onClick={() => setIsMediaModalOpen(true)}
              title="Open Live Camera (Snap Photo, Record Video, or Upload)"
              style={{
                borderColor: attachedMedia ? '#10b981' : undefined,
                color: attachedMedia ? '#34d399' : undefined,
              }}
            >
              <Camera size={16} />
            </button>

            {/* Microphone Speech-To-Text Button */}
            {isSupported && (
              <button
                type="button"
                className={`mic-btn ${isListening ? 'recording' : ''}`}
                onClick={toggleListening}
                title={isListening ? 'Listening... click to stop' : 'Click to speak memory'}
                style={isListening ? { animation: 'pulse 1s infinite', background: '#ef4444', color: '#fff' } : {}}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || (!text.trim() && !attachedMedia)}
              style={{ padding: '8px 16px' }}
            >
              {isSubmitting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="location-pulse" style={{ width: '6px', height: '6px' }} />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <span>Remember</span>
                  <Send size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Active Listening Soundwave Indicator */}
      {isListening && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#f87171',
            fontSize: '0.8rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div className="location-pulse" style={{ width: '8px', height: '8px', background: '#ef4444' }} />
          <span>Listening to your voice... speak now (e.g. "I left my passport in the blue folder")</span>
        </div>
      )}

      {/* Example Prompt Chips */}
      <div className="capture-examples">
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Try:</span>
        {EXAMPLE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            className="example-chip"
            onClick={() => handleChipClick(prompt)}
          >
            "{prompt.length > 38 ? prompt.slice(0, 38) + '...' : prompt}"
          </button>
        ))}
      </div>

      {/* Extraction Result Feedback Drawer */}
      {lastExtraction && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#34d399" />
            <div>
              <strong style={{ color: '#e0e7ff' }}>Memory Extracted:</strong>{' '}
              <span>{lastExtraction.summary || lastExtraction.object}</span>
              {lastExtraction.location && (
                <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  &bull; 📍 {lastExtraction.location}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`badge badge-${lastExtraction.risk_level || 'medium'}`}>
              {lastExtraction.risk_level} Risk
            </span>
          </div>
        </div>
      )}

      {/* Live Camera Photo & Video Capture Modal */}
      <MediaCaptureModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onMediaCaptured={handleMediaCaptured}
      />
    </div>
  );
};
