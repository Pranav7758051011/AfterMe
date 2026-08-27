import React, { useState } from 'react';
import {
  MapPin, Clock, Calendar, Check, RotateCcw, Trash2,
  CheckCircle2, User, Package, FileText, CheckSquare, Lightbulb,
  Brain, Image as ImageIcon, X, Film, Play, Share2, Target, Navigation
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Memory } from '../types';
import { KNOWN_PLACES } from './LocationSimulator';

interface MemoryCardProps {
  memory: Memory;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onLocateOnMap?: (location: { lat: number; lng: number; name: string; label?: string; memoryId?: string }) => void;
  onShare?: (memory: Memory) => void;
}

const TYPE_ICON: Record<string, { emoji: string; color: string }> = {
  belonging: { emoji: '📦', color: 'var(--accent)' },
  document:  { emoji: '📄', color: 'var(--info)' },
  task:      { emoji: '✅', color: 'var(--success)' },
  event:     { emoji: '📅', color: 'var(--warning)' },
  person:    { emoji: '👤', color: '#a78bfa' },
  idea:      { emoji: '💡', color: '#f59e0b' },
  location:  { emoji: '📍', color: 'var(--danger)' },
  other:     { emoji: '🧠', color: 'var(--text-tertiary)' },
};

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onStatusChange,
  onDelete,
  onLocateOnMap,
  onShare,
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isRetrieved = memory.status === 'retrieved';
  const isCompleted = memory.status === 'completed';
  const isForgotten = memory.status === 'potentially_forgotten';

  const isVideo = Boolean(
    memory.image_url &&
    (memory.image_url.startsWith('data:video') ||
      memory.image_url.endsWith('.mp4') ||
      memory.image_url.endsWith('.webm'))
  );

  // Car special case
  const isCar = memory.object?.toLowerCase().includes('car') || memory.location?.toLowerCase().includes('park');
  const typeData = isCar
    ? { emoji: '🚗', color: 'var(--info)' }
    : TYPE_ICON[memory.memory_type] || TYPE_ICON.other;

  const displayName = memory.object || memory.task || memory.event || memory.original_text.slice(0, 50);

  const handleToggleRetrieved = () => {
    if (!isRetrieved) {
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 }, colors: ['#4F6EF7', '#34d399', '#818cf8'] });
      onStatusChange(memory.id, 'retrieved');
    } else {
      onStatusChange(memory.id, 'active');
    }
  };

  const handleToggleTask = () => {
    if (!isCompleted) {
      confetti({ particleCount: 45, spread: 55, origin: { y: 0.7 }, colors: ['#4F6EF7', '#34d399', '#818cf8'] });
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
      const match = KNOWN_PLACES.find(p => memory.location?.toLowerCase().includes(p.name.toLowerCase()));
      lat = match ? match.lat : 37.7749;
      lng = match ? match.lng : -122.4194;
    }

    if (lat != null && lng != null) {
      onLocateOnMap({ lat, lng, name, label: memory.object || memory.task || memory.original_text, memoryId: memory.id });
    }
  };

  const formattedTime = new Date(memory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = new Date(memory.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <>
      <div
        className={`memory-card ${memory.status}`}
        style={{ cursor: 'default' }}
      >
        {/* Card Header */}
        <div className="card-header">
          <div className="card-type-icon" style={{ borderColor: `${typeData.color}30` }}>
            <span role="img" aria-label={memory.memory_type}>{typeData.emoji}</span>
          </div>

          <div className="card-title-area">
            <div className="card-title" title={displayName}>{displayName}</div>
            <div className="card-type-label">{memory.memory_type}</div>
          </div>

          <div className="card-badges">
            {isForgotten && (
              <span className="badge badge-high" style={{ fontSize: '0.68rem' }}>
                ⚠ At Risk
              </span>
            )}
            {!isForgotten && (
              <span className={`badge badge-${memory.risk_level}`}>
                {memory.risk_level}
              </span>
            )}
            {(isRetrieved || isCompleted) && (
              <span className="badge badge-success">
                ✓ {isRetrieved ? 'Retrieved' : 'Done'}
              </span>
            )}
          </div>
        </div>

        {/* Quote Body */}
        <div className="card-body">
          {memory.original_text.length > 120 && !isExpanded
            ? `${memory.original_text.slice(0, 120)}…`
            : memory.original_text}
          {memory.original_text.length > 120 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                marginLeft: 4,
                fontFamily: 'var(--font-ui)',
              }}
            >
              {isExpanded ? 'Less' : 'More'}
            </button>
          )}
        </div>

        {/* Media Thumbnail */}
        {memory.image_url && (
          <div className="card-image-thumb" onClick={() => setShowImageModal(true)}>
            {isVideo ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 130 }}>
                <video src={memory.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={16} color="#fff" />
                </div>
              </div>
            ) : (
              <img src={memory.image_url} alt="Memory attachment" />
            )}
            <div className="card-image-thumb-label">
              {isVideo ? <Film size={11} /> : <ImageIcon size={11} />}
              <span>{isVideo ? 'Video' : 'Photo'}</span>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="card-meta">
          {memory.location && (
            <button type="button" className="card-meta-item" onClick={handleLocateClick} title="Highlight on map">
              <MapPin size={11} />
              <span>{memory.location}</span>
            </button>
          )}
          {memory.person && (
            <div className="card-meta-item" style={{ cursor: 'default' }}>
              <User size={11} />
              <span>{memory.person}</span>
            </div>
          )}
          {memory.deadline && (
            <div className="card-meta-item deadline">
              <Clock size={11} />
              <span>Due: {memory.deadline}</span>
            </div>
          )}
          {memory.date && (
            <div className="card-meta-item" style={{ cursor: 'default' }}>
              <Calendar size={11} />
              <span>{memory.date}{memory.time ? ` at ${memory.time}` : ''}</span>
            </div>
          )}
          <div className="card-meta-item" style={{ marginLeft: 'auto', cursor: 'default', borderColor: 'transparent', background: 'transparent' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
              {formattedDate} · {formattedTime}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="card-actions">
          {memory.memory_type === 'belonging' && (
            <button
              type="button"
              className={`btn btn-sm ${isRetrieved ? 'btn-secondary' : 'btn-success'}`}
              onClick={handleToggleRetrieved}
            >
              {isRetrieved ? <><RotateCcw size={12} /> Mark Active</> : <><CheckCircle2 size={12} /> Retrieved</>}
            </button>
          )}

          {memory.memory_type === 'task' && (
            <button
              type="button"
              className={`btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-success'}`}
              onClick={handleToggleTask}
            >
              {isCompleted ? <><RotateCcw size={12} /> Reopen</> : <><Check size={12} /> Complete</>}
            </button>
          )}

          <div className="card-actions-right">
            {memory.location && onLocateOnMap && (
              <button
                type="button"
                className="btn btn-ghost btn-icon-sm"
                onClick={handleLocateClick}
                title="Locate on map"
              >
                <Navigation size={13} />
              </button>
            )}

            {onShare && (
              <button
                type="button"
                className="btn btn-ghost btn-icon-sm"
                onClick={() => onShare(memory)}
                title="Share memory"
              >
                <Share2 size={13} />
              </button>
            )}

            <button
              type="button"
              className="btn btn-ghost btn-icon-sm"
              onClick={() => onDelete(memory.id)}
              title="Delete memory"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Full Image/Video Modal */}
      {showImageModal && memory.image_url && (
        <div className="modal-overlay" onClick={() => setShowImageModal(false)} style={{ zIndex: 4000 }}>
          <div
            className="media-modal-inner"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="btn btn-ghost btn-icon-sm"
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
            >
              <X size={16} />
            </button>

            {isVideo ? (
              <video src={memory.image_url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 'var(--r-md)' }} />
            ) : (
              <img src={memory.image_url} alt="Memory attachment" style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 'var(--r-md)', objectFit: 'contain' }} />
            )}

            <div style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{memory.object || memory.original_text}</strong>
              {memory.location && <span> · 📍 {memory.location}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
