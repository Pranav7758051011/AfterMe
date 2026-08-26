import React, { useState } from 'react';
import { 
  MapPin, Clock, Calendar, Check, RotateCcw, Trash2, 
  AlertTriangle, FileText, CheckCircle2, User, Lightbulb, Package, Target, Image as ImageIcon, X, Car, Film, Play
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Memory } from '../types';
import { KNOWN_PLACES } from './LocationSimulator';

interface MemoryCardProps {
  memory: Memory;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onLocateOnMap?: (location: { lat: number; lng: number; name: string; label?: string; memoryId?: string }) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onStatusChange, onDelete, onLocateOnMap }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const isRetrieved = memory.status === 'retrieved';
  const isCompleted = memory.status === 'completed';
  const isForgotten = memory.status === 'potentially_forgotten';

  const isVideo = Boolean(
    memory.image_url &&
    (memory.image_url.startsWith('data:video') ||
      memory.image_url.endsWith('.mp4') ||
      memory.image_url.endsWith('.webm'))
  );

  const getTypeIcon = () => {
    if (memory.object?.toLowerCase().includes('car') || memory.location?.toLowerCase().includes('park')) {
      return '🚗';
    }
    switch (memory.memory_type) {
      case 'belonging':
        return '🔌';
      case 'document':
        return '📁';
      case 'task':
        return '📝';
      case 'event':
        return '📅';
      case 'person':
        return '👤';
      case 'idea':
        return '💡';
      default:
        return '🧠';
    }
  };

  const getDisplayName = () => {
    if (memory.object) return memory.object;
    if (memory.task) return memory.task;
    if (memory.event) return memory.event;
    return memory.original_text.slice(0, 45);
  };

  const handleToggleRetrieved = () => {
    if (!isRetrieved) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      onStatusChange(memory.id, 'retrieved');
    } else {
      onStatusChange(memory.id, 'active');
    }
  };

  const handleToggleTask = () => {
    if (!isCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      onStatusChange(memory.id, 'completed');
    } else {
      onStatusChange(memory.id, 'active');
    }
  };

  const handleLocateClick = () => {
    if (!onLocateOnMap) return;

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

    if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
      onLocateOnMap({
        lat,
        lng,
        name,
        label: memory.object || memory.task || memory.original_text,
        memoryId: memory.id,
      });
    }
  };

  const formattedTime = new Date(memory.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`memory-card ${memory.status}`}>
      <div>
        <div className="card-top">
          <div className="item-title-wrap">
            <div className="type-icon">{getTypeIcon()}</div>
            <div>
              <div className="item-name">{getDisplayName()}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {memory.memory_type}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span className={`badge badge-${memory.risk_level}`}>
              {memory.risk_level}
            </span>
            {isForgotten && (
              <span className="badge badge-critical" title="Potentially forgotten item">
                ⚠️ Left Behind
              </span>
            )}
            {isRetrieved && (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                ✓ Retrieved
              </span>
            )}
            {isCompleted && (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                ✓ Done
              </span>
            )}
          </div>
        </div>

        {/* Original Natural Language Quote */}
        <p className="card-original-text">
          "{memory.original_text}"
        </p>

        {/* Photo or Video Attachment Thumbnail */}
        {memory.image_url && (
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                cursor: 'pointer',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.15)',
                width: '100%',
                maxHeight: '140px',
                background: '#090d16',
              }}
              onClick={() => setShowImageModal(true)}
              title={isVideo ? 'Click to play video memory' : 'Click to view full photo'}
            >
              {isVideo ? (
                <div style={{ position: 'relative', width: '100%', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video src={memory.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div
                    style={{
                      position: 'absolute',
                      background: 'rgba(0,0,0,0.6)',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={18} color="#fff" />
                  </div>
                </div>
              ) : (
                <img
                  src={memory.image_url}
                  alt="Memory attachment"
                  style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', display: 'block' }}
                />
              )}

              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  background: 'rgba(0,0,0,0.75)',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                {isVideo ? <Film size={11} /> : <ImageIcon size={11} />}
                <span>{isVideo ? 'Video' : 'Photo'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Metadata Details */}
        <div className="card-meta">
          {memory.location && (
            <button
              type="button"
              className="meta-item"
              onClick={handleLocateClick}
              title="Click to circle and highlight on map"
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '3px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#c7d2fe',
                fontWeight: 600,
              }}
            >
              <Target size={13} color="var(--accent-primary)" />
              <span>📍 {memory.location} (Circle Area)</span>
            </button>
          )}

          {memory.person && (
            <div className="meta-item">
              <User size={13} color="var(--accent-cyan)" />
              <span>{memory.person}</span>
            </div>
          )}

          {memory.deadline && (
            <div className="meta-item" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
              <Clock size={13} color="var(--accent-amber)" />
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>⏰ Due: {memory.deadline}</span>
            </div>
          )}

          {memory.date && (
            <div className="meta-item">
              <Calendar size={13} color="var(--accent-rose)" />
              <span>{memory.date} {memory.time ? `at ${memory.time}` : ''}</span>
            </div>
          )}

          <div className="meta-item" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="card-actions">
        {memory.memory_type === 'belonging' && (
          <button
            className={`btn btn-sm ${isRetrieved ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggleRetrieved}
          >
            {isRetrieved ? (
              <>
                <RotateCcw size={13} />
                <span>Mark Active</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={13} />
                <span>Mark Retrieved</span>
              </>
            )}
          </button>
        )}

        {memory.memory_type === 'task' && (
          <button
            className={`btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggleTask}
          >
            {isCompleted ? (
              <>
                <RotateCcw size={13} />
                <span>Reopen Task</span>
              </>
            ) : (
              <>
                <Check size={13} />
                <span>Complete Task</span>
              </>
            )}
          </button>
        )}

        {memory.location && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleLocateClick}
            title="Circle location on map"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
          >
            <Target size={13} color="#10b981" />
            <span>Circle Area</span>
          </button>
        )}

        <button
          className="btn btn-secondary btn-sm"
          style={{ color: 'var(--text-muted)' }}
          onClick={() => onDelete(memory.id)}
          title="Delete memory"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Full Photo / Video Modal Preview */}
      {showImageModal && memory.image_url && (
        <div
          className="ask-drawer-overlay"
          onClick={() => setShowImageModal(false)}
          style={{ zIndex: 2000 }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              margin: 'auto',
              background: '#0f172a',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImageModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0,0,0,0.6)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <X size={18} />
            </button>

            {isVideo ? (
              <video
                src={memory.image_url}
                controls
                autoPlay
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '10px' }}
              />
            ) : (
              <img
                src={memory.image_url}
                alt="Full size memory attachment"
                style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '10px', objectFit: 'contain' }}
              />
            )}

            <div style={{ marginTop: '12px', color: '#e2e8f0', fontSize: '0.9rem' }}>
              <strong>{memory.object || memory.original_text}</strong> &bull; 📍 {memory.location || 'Location'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
