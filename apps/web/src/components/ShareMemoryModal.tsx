import React, { useState } from 'react';
import { 
  Share2, QrCode, Copy, Check, ExternalLink, X, 
  MapPin, MessageCircle, ShieldCheck, Tag 
} from 'lucide-react';
import { Memory } from '../types';

interface ShareMemoryModalProps {
  memory: Memory | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareMemoryModal: React.FC<ShareMemoryModalProps> = ({
  memory,
  isOpen,
  onClose,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !memory) return null;

  const itemTitle = memory.object || memory.task || memory.original_text;
  const itemLocation = memory.location || 'Current recorded spot';
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/#memory-${memory.id}` : `https://afterme-ai-app.web.app/#memory-${memory.id}`;
  
  // High-contrast QR Code SVG Data URL generator for offline reliability
  const encodedData = encodeURIComponent(`AfterMe Handover:\nItem: ${itemTitle}\nLocation: ${itemLocation}\nStatus: ${memory.status}\nLink: ${shareUrl}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=63-102-241&bgcolor=0f-17-2a&data=${encodedData}`;

  const shareText = `📍 AfterMe Item Handover:\nI left my "${itemTitle}" at ${itemLocation}.\nView details here: ${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div
        className="auth-modal-card"
        style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={18} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Share & Handover Item
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Send item location to teammates or family members to claim or retrieve:
        </p>

        {/* Item Summary Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '12px 14px',
            textAlign: 'left',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginBottom: '4px' }}>
            🔌 {itemTitle}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#38bdf8' }}>
            <MapPin size={13} />
            <span>{itemLocation}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '6px' }}>
            "{memory.original_text}"
          </div>
        </div>

        {/* QR Code */}
        <div
          style={{
            background: '#0f172a',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'inline-block',
            marginBottom: '16px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)',
          }}
        >
          <img
            src={qrCodeUrl}
            alt="Handover QR Code"
            style={{ width: '150px', height: '150px', borderRadius: '8px', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>
            📱 Scan with phone camera
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCopyLink}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {isCopied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
            <span>{isCopied ? 'Copied Handover Link!' : 'Copy Handover Link'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleWhatsAppShare}
            style={{
              width: '100%',
              justifyContent: 'center',
              borderColor: 'rgba(37, 211, 102, 0.4)',
              color: '#25d366',
            }}
          >
            <MessageCircle size={16} />
            <span>Share via WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
