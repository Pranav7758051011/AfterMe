import React from 'react';
import { AlertTriangle, CheckCircle2, MapPin, X, BellRing } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProactiveAlert } from '../types';

interface ProactiveAlertBannerProps {
  alerts: ProactiveAlert[];
  onDismiss: (id: string) => void;
  onMarkRetrieved: (memoryId: string, alertId: string) => void;
}

export const ProactiveAlertBanner: React.FC<ProactiveAlertBannerProps> = ({
  alerts,
  onDismiss,
  onMarkRetrieved,
}) => {
  if (!alerts || alerts.length === 0) return null;

  const handleRetrieved = (memoryId: string, alertId: string) => {
    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    onMarkRetrieved(memoryId, alertId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
      {alerts.map(alert => (
        <div key={alert.id} className="proactive-alert-box">
          <div className="alert-content">
            <div className="alert-icon-wrap">
              <BellRing size={24} className="animate-bounce" />
            </div>
            <div>
              <div className="alert-title">
                <span>{alert.title}</span>
                <span className={`badge badge-${alert.severity || 'high'}`}>
                  {alert.severity} Risk
                </span>
              </div>
              <p className="alert-message">{alert.message}</p>
              {alert.memory?.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.8rem', color: '#fecaca' }}>
                  <MapPin size={12} />
                  <span>Left at: <strong>{alert.memory.location}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div className="alert-actions">
            <button
              className="btn btn-sm"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 700 }}
              onClick={() => handleRetrieved(alert.memory_id, alert.id)}
            >
              <CheckCircle2 size={14} />
              <span>Retrieved</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onDismiss(alert.id)}
              title="Dismiss warning"
            >
              <X size={14} />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
