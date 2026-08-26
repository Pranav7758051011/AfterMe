import React, { useState, useRef } from 'react';
import { Sparkles, Mic, MicOff, Send, CheckCircle2, ShieldAlert, Camera, Image, X, Car } from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';

interface MemoryInputProps {
  onSave: (text: string, options?: { imageUrl?: string; imageBase64?: string; latitude?: number; longitude?: number }) => Promise<{ memory: any; extraction: any }>;
  currentLocation: string;
  userLatitude?: number;
  userLongitude?: number;
}

const EXAMPLE_PROMPTS = [
  'I left my black laptop charger in the conference room.',
  'My passport is in the blue folder in the top desk drawer.',
  'Parked my car on Floor 2, Bay B-14.',
  'I need to send the project report to Professor Davis by Friday.',
  'I left my AirPods on the 2nd floor library study table.',
];

export const MemoryInput: React.FC<MemoryInputProps> = ({ onSave, currentLocation, userLatitude, userLongitude }) => {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, isSupported, toggleListening } = useSpeechToText((transcript) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setSelectedImage(base64);
        if (!text.trim()) {
          setText('Stored item with attached photo at ' + currentLocation);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickParkCar = () => {
    setText(`Parked my vehicle at ${currentLocation}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedImage) || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const promptText = text.trim() || (selectedImage ? `Stored item photo at ${currentLocation}` : '');
      const res = await onSave(promptText, {
        imageBase64: selectedImage || undefined,
        latitude: userLatitude,
        longitude: userLongitude,
      });

      setLastExtraction(res.extraction);
      setText('');
      setSelectedImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

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
    <div className="capture-card">
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

      {/* Image Preview if uploaded */}
      {selectedImage && (
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '10px' }}>
          <img
            src={selectedImage}
            alt="Memory attachment"
            style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '10px', border: '2px solid var(--accent-primary)' }}
          />
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="capture-input-wrap">
          <input
            type="text"
            className="capture-input"
            placeholder='e.g. "I left my black laptop charger in the conference room..."'
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />

          <div className="capture-btn-group">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />

            {/* Photo Attachment Button */}
            <button
              type="button"
              className="btn btn-secondary btn-icon btn-sm"
              onClick={() => fileInputRef.current?.click()}
              title="Attach a photo (Gemini Vision multimodal extraction)"
            >
              <Camera size={16} color={selectedImage ? '#34d399' : 'var(--text-secondary)'} />
            </button>

            {isSupported && (
              <button
                type="button"
                className={`mic-btn ${isListening ? 'recording' : ''}`}
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Speak to remember'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || (!text.trim() && !selectedImage)}
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
    </div>
  );
};
