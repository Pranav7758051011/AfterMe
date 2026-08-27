import React from 'react';
import { 
  Brain, Shield, Heart, Sparkles, MapPin, 
  Cpu, Users, Radio, Award, ExternalLink, Code2, Globe
} from 'lucide-react';

interface CompanyFooterProps {
  onNavigateToTab?: (tab: any) => void;
}

const FOUNDERS = [
  {
    name: 'Pranav Bade',
    role: 'Co-Founder & Systems Lead',
    avatar: 'PB',
    color: '#4F6EF7',
    github: 'https://github.com/rajdeep-r24/AfterMe',
    tag: 'Core Architecture',
  },
  {
    name: 'Rajdeep Rathod',
    role: 'Co-Founder & AI Architect',
    avatar: 'RR',
    color: '#10b981',
    github: 'https://github.com/rajdeep-r24',
    tag: 'Spatial Intelligence',
  },
  {
    name: 'Vedant Soni',
    role: 'Co-Founder & Product Lead',
    avatar: 'VS',
    color: '#a855f7',
    github: 'https://github.com/rajdeep-r24/AfterMe',
    tag: 'Experience & UX',
  },
];

export const CompanyFooter: React.FC<CompanyFooterProps> = ({ onNavigateToTab }) => {
  return (
    <footer className="company-footer" style={{ marginTop: 'var(--sp-12)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-10)' }}>
      {/* Top Grid: Brand, Mission, Founders, Tech */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'var(--sp-8)',
          marginBottom: 'var(--sp-8)',
        }}
      >
        {/* Col 1: Brand & Mission */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              <Brain size={18} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                AfterMe
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, marginLeft: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Inc.
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
            The world's first proactive spatial memory engine. Eliminating forgotten items, parking stress, and departure oversights before they happen.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--success-text)',
                background: 'var(--success-subtle)',
                border: '1px solid var(--success-border)',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} className="animate-pulse" />
              <span>All Systems Operational</span>
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                background: 'var(--bg-tertiary)',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
              }}
            >
              <Shield size={11} />
              <span>Zero-Hallucination Verified</span>
            </span>
          </div>
        </div>

        {/* Col 2: Founders & Leadership */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Award size={16} color="var(--accent)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Founders & Leadership
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FOUNDERS.map((founder) => (
              <div
                key={founder.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--r-md)',
                  padding: '8px 12px',
                  transition: 'border-color 0.2s ease, transform 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: founder.color,
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 2px 8px ${founder.color}40`,
                    }}
                  >
                    {founder.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {founder.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      {founder.role}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    background: 'var(--accent-subtle)',
                    padding: '2px 6px',
                    borderRadius: 'var(--r-xs)',
                  }}
                >
                  {founder.tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Core Technology & Open Source */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Cpu size={16} color="var(--accent-cyan)" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Engineered With
            </h4>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>✦</span>
              <span><strong>Google Gemini 2.5 Flash</strong> (Neural Reasoning)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--success)' }}>✦</span>
              <span><strong>Firebase Firestore</strong> (Real-Time Cloud Mesh)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--warning)' }}>✦</span>
              <span><strong>Geofence Defense</strong> (Sub-50m Spatial Safety)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent)' }}>✦</span>
              <span><strong>Multimodal Vision & Speech</strong> (Photo & Audio Recall)</span>
            </li>
          </ul>

          <div style={{ marginTop: '16px' }}>
            <a
              href="https://github.com/rajdeep-r24/AfterMe"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
            >
              <Code2 size={14} />
              <span>GitHub Repository</span>
              <ExternalLink size={12} style={{ opacity: 0.6 }} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Attribution */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 'var(--sp-5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.78rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <div>
          © {new Date().getFullYear()} <strong>AfterMe Inc.</strong> All rights reserved.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Created with precision & passion by</span>
          <strong style={{ color: 'var(--text-primary)' }}>Pranav Bade</strong>,
          <strong style={{ color: 'var(--text-primary)' }}>Rajdeep Rathod</strong>, and
          <strong style={{ color: 'var(--text-primary)' }}>Vedant Soni</strong>.
        </div>
      </div>
    </footer>
  );
};
