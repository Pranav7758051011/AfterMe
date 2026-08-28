import React from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap, X, CheckCircle2, Shield, Brain,
  Compass, Zap, Server, FileText, ChevronRight
} from 'lucide-react';

interface VivaDemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VivaDemoGuideModal: React.FC<VivaDemoGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glow)',
          borderRadius: '20px',
          maxWidth: '840px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '24px 28px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(99, 102, 241, 0.25)',
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={22} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Examiner Viva & Technical Defense Guide
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                B.TECH CSE CAPSTONE DEFENSE ARCHITECTURE
              </div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon-sm"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Project Novelty & Problem Statement */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Zap size={15} /> 1. Problem Statement & Novelty
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Traditional note and reminder apps (Google Keep, Apple Reminders) are <strong>passive</strong>: users must remember to open the app and manually search. 
            <strong> AfterMe</strong> introduces an <strong>ambient proactive memory layer</strong> that combines natural language memory capture, multimodal photo vision, real-time WGS-84 GPS geofencing, and context-grounded conversational retrieval with verifiable citations.
          </p>
        </div>

        {/* 2. Key Architecture Dimensions */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Server size={15} /> 2. Five-Tier System Architecture
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>1. Client Tier</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>React 19 Web App (Leaflet + Web Speech) & React Native Expo Mobile App</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-text)' }}>2. Backend Engine</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Node.js & TypeScript Express REST API with Zod validation middleware</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--info-text)' }}>3. AI Multimodal Tier</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Google Gemini 2.5 Flash with strict grounding & heuristic fallback</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning-text)' }}>4. Spatial Geofence</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Haversine great-circle distance math on WGS-84 sphere (R = 6,371 km)</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa' }}>5. Cloud Data Layer</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Cloud Firestore collections (memories, alerts, users) with security rules</div>
            </div>
          </div>
        </div>

        {/* 3. Common Viva Questions & Technical Answers */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Shield size={15} /> 3. Examiner Technical Defense Cheatsheet
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px 14px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Q: Why use the Haversine formula instead of Euclidean distance?
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                <strong>Defense:</strong> Naive Euclidean distance √(Δx² + Δy²) operates on a flat Cartesian plane. On Earth's sphere, 1° of latitude is ~111 km, but 1° of longitude scales as 111 × cos(latitude) km. At 37.7°N, Euclidean distance distorts distances by &gt; 25%, turning circular geofences into squashed ellipses and causing severe false alarms. Haversine accounts for spherical great-circle curvature.
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Q: How does AfterMe guarantee grounded responses and minimize hallucinations?
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                <strong>Defense:</strong> 1) Prompts enforce strict context constraints (LLM only synthesizes passed memory objects). 2) Backend citation filters verify all returned IDs against the authentic database collection. 3) Unknown items trigger explicit rejection ("I don't have a memory of [x]") rather than speculative guesses.
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border-faint)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Q: How does the system prevent notification spam when a user stays outside?
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                <strong>Defense:</strong> An in-memory geofence state tracker maintains transition states (`inside` vs `outside`). A departure emits exactly 1 alert. Subsequent GPS ticks outside suppress duplicates. The detector automatically re-arms only when the user re-enters the geofence (d ≤ radius).
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            AfterMe Capstone Evaluation Suite &bull; Ready for Live Defense
          </div>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
