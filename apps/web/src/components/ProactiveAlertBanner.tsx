import React from 'react';
import { AlertTriangle, X, CheckCircle2, Navigation } from 'lucide-react';
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
  const visibleAlerts = alerts.filter(a => !a.is_dismissed).slice(0, 3);
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="alert-toast-container">
      {visibleAlerts.map(alert => {
        const severity = alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'high' : 'medium';
        return (
          <div key={alert.id} className={`alert-toast ${severity}`}>
            <div
              className="alert-toast-icon"
              style={
                severity === 'critical'
                  ? { background: 'var(--danger-subtle)', color: 'var(--danger-text)' }
                  : { background: 'var(--warning-subtle)', color: 'var(--warning-text)' }
              }
            >
              <AlertTriangle size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="alert-toast-title">{alert.title}</div>
              <div className="alert-toast-body">{alert.message}</div>
              {alert.distance_meters !== undefined && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                  {alert.distance_meters}m away from item
                </div>
              )}
              <div className="alert-toast-actions">
                <button
                  type="button"
                  className="btn btn-success btn-xs"
                  onClick={() => onMarkRetrieved(alert.memory_id, alert.id)}
                >
                  <CheckCircle2 size={11} />
                  Retrieved
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => onDismiss(alert.id)}
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Dismiss
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-icon-sm"
              onClick={() => onDismiss(alert.id)}
              style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
