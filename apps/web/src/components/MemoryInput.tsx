import React, { useState, useRef, useEffect } from 'react';
import {
  Mic, MicOff, Send, CheckCircle2,
  Camera, X, Car, Film, AlertCircle, Sparkles
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
  'I left my laptop charger in the conference room',
  'Passport is in the blue folder, top desk drawer',
  'Parked on Floor 2, Bay B-14',
  'Send project report to Prof. Davis by Friday',
  'AirPods on the 2nd floor library study table',
];

export const MemoryInput: React.FC<MemoryInputProps> = ({
  onSave,
  currentLocation,
  userLatitude,
  userLongitude,
  prefilledText,
}) => {
  const [text, setText] = useState(prefilledText || '');
  const [attachedMedia, setAttachedMedia] = useState<{ type: 'image' | 'video'; base64: string; mimeType: string } | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefilledText !== undefined && prefilledText !== null) {
      setText(prefilledText);
      if (inputRef.current) inputRef.current.focus();
    }
  }, [prefilledText]);

  const { isListening, isSupported, errorMessage: micError, toggleListening } = useSpeechToText(transcript => {
    setText(prev => prev ? `${prev} ${transcript}` : transcript);
  });

  const handleQuickParkCar = () => setText(`Parked my vehicle at ${currentLocation}`);

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
      setTimeout(() => setLastExtraction(null), 6000);
    } catch (err) {
      console.error('Error saving memory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="capture-card" id="memory-input-section">
      {/* Label Row */}
      <div className="capture-label">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} color="var(--accent)" />
          <span>What should I remember?</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={handleQuickParkCar}
            title="Quick: Log parked car"
            style={{ color: 'var(--info-text)', borderColor: 'var(--info-border)', background: 'var(--info-subtle)' }}
          >
            <Car size={11} />
            Parked Here
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-tertiary)', letterSpacing: '0.06em' }}>
            Gemini AI
          </span>
        </div>
      </div>

      {/* Mic Error */}
      {micError && (
        <div style={{
          padding: '8px 12px',
          background: 'var(--warning-subtle)',
          border: '1px solid var(--warning-border)',
          borderRadius: 'var(--r-md)',
          color: 'var(--warning-text)',
          fontSize: '0.78rem',
          marginBottom: 'var(--sp-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <AlertCircle size={13} />
          <span>{micError}</span>
        </div>
      )}

      {/* Media Preview */}
      {attachedMedia && (
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 'var(--sp-3)' }}>
          {attachedMedia.type === 'video' ? (
            <div style={{ width: 100, height: 72, borderRadius: 'var(--r-md)', border: '1px solid var(--accent-border)', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              <video src={attachedMedia.base64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <Film size={18} color="#fff" style={{ position: 'absolute' }} />
            </div>
          ) : (
            <img src={attachedMedia.base64} alt="Attachment" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--r-md)', border: '1px solid var(--accent-border)', display: 'block' }} />
          )}
          <button
            type="button"
            onClick={() => setAttachedMedia(null)}
            style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Input Row */}
      <form onSubmit={handleSubmit}>
        <div className="capture-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="capture-input"
            placeholder='e.g. "I left my charger in the conference room…"'
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />

          <div className="capture-btn-group">
            {/* Camera */}
            <button
              type="button"
              className="mic-btn"
              onClick={() => setIsMediaModalOpen(true)}
              title="Attach photo or video"
              style={attachedMedia ? { color: 'var(--success-text)', background: 'var(--success-subtle)' } : {}}
            >
              <Camera size={15} />
            </button>

            {/* Mic */}
            {isSupported && (
              <button
                type="button"
                className={`mic-btn${isListening ? ' recording' : ''}`}
                onClick={toggleListening}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Mic size={15} color="#fff" />
                    <div className="soundwave-visualizer">
                      <span className="soundwave-bar" />
                      <span className="soundwave-bar" />
                      <span className="soundwave-bar" />
                    </div>
                  </div>
                ) : (
                  <MicOff size={15} />
                )}
              </button>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || (!text.trim() && !attachedMedia)}
            >
              {isSubmitting ? (
                <>
                  <div className="live-dot" style={{ width: 6, height: 6 }} />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <span>Remember</span>
                  <Send size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Listening Indicator */}
      {isListening && (
        <div style={{
          marginTop: 'var(--sp-3)',
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
          animation: 'fadeIn 0.2s ease',
        }}>
          <div className="live-dot" style={{ background: 'var(--danger-text)' }} />
          Listening… speak now
        </div>
      )}

      {/* Example Chips */}
      <div className="capture-examples">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
          TRY
        </span>
        {EXAMPLE_PROMPTS.slice(0, 3).map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            className="example-chip"
            onClick={() => setText(prompt)}
          >
            {prompt.length > 32 ? prompt.slice(0, 32) + '…' : prompt}
          </button>
        ))}
      </div>

      {/* Extraction Feedback */}
      {lastExtraction && (
        <div className="extraction-feedback">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={16} color="var(--success-text)" />
            <div style={{ fontSize: '0.84rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Extracted: </strong>
              <span style={{ color: 'var(--text-secondary)' }}>
                {lastExtraction.summary || lastExtraction.object}
              </span>
              {lastExtraction.location && (
                <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>
                  · 📍 {lastExtraction.location}
                </span>
              )}
            </div>
          </div>
          <span className={`badge badge-${lastExtraction.risk_level || 'medium'}`}>
            {lastExtraction.risk_level}
          </span>
        </div>
      )}

      {/* Media Capture Modal */}
      <MediaCaptureModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onMediaCaptured={handleMediaCaptured}
      />
    </div>
  );
};
