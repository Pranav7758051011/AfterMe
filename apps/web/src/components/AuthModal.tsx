import React, { useState, useEffect } from 'react';
import { 
  X, User, Shield, KeyRound, Check, Sparkles, LogIn, UserPlus, 
  LogOut, Mail, Lock, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { setApiUser, getApiUserId } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChanged: (userId: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onUserChanged }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'demo'>('signin');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [currentId, setCurrentId] = useState(getApiUserId());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const id = user.uid;
        setCurrentId(id);
        setApiUser(id);
        onUserChanged(id);
      }
    });
    return () => unsubscribe();
  }, [onUserChanged]);

  if (!isOpen) return null;

  const handleSelectUser = (id: string) => {
    setApiUser(id);
    setCurrentId(id);
    onUserChanged(id);
    setSuccessMessage(`Switched to persona: ${id}`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 800);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setCurrentUser(user);
      const uid = user.uid;
      setCurrentId(uid);
      setApiUser(uid);
      onUserChanged(uid);
      setSuccessMessage(`Signed in as ${user.displayName || user.email}!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password Sign-In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = result.user;
      setCurrentUser(user);
      setCurrentId(user.uid);
      setApiUser(user.uid);
      onUserChanged(user.uid);
      setSuccessMessage(`Signed in as ${user.email}!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Email Sign-In Error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMessage('Invalid email or password. Please check your credentials or create an account.');
      } else {
        setErrorMessage(err.message || 'Failed to sign in.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password Sign-Up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = result.user;
      setCurrentUser(user);
      setCurrentId(user.uid);
      setApiUser(user.uid);
      onUserChanged(user.uid);
      setSuccessMessage(`Account created for ${user.email}!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Email Sign-Up Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already in use. Please sign in instead.');
      } else {
        setErrorMessage(err.message || 'Failed to create account.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      handleSelectUser('demo_user_001');
      setSuccessMessage('Signed out. Reset to default demo session.');
    } catch (err: any) {
      console.error('Sign Out Error:', err);
      setErrorMessage('Failed to sign out.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ask-drawer-overlay" onClick={onClose}>
      <div
        className="capture-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          margin: 'auto',
          animation: 'slideDown 0.2s ease',
          zIndex: 101,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="logo-badge" style={{ width: '34px', height: '34px' }}>
              <Shield size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Firebase Authentication</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Project: <strong>afterme-ai-app</strong>
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Current User Status Banner */}
        <div
          style={{
            padding: '12px 14px',
            background: currentUser ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
            border: `1px solid ${currentUser ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color={currentUser ? '#34d399' : 'var(--accent-primary)'} />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {currentUser ? 'Logged in as' : 'Active Firestore Tenant ID'}
              </div>
              <strong style={{ color: '#fff' }}>
                {currentUser ? currentUser.email || currentUser.displayName || currentUser.uid : currentId}
              </strong>
            </div>
          </div>

          {currentUser ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSignOut}
              disabled={isLoading}
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#f87171' }}
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          ) : (
            <span className="badge badge-medium">Demo Mode</span>
          )}
        </div>

        {/* Success / Error Messages */}
        {successMessage && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              color: '#34d399',
              fontSize: '0.8rem',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'signin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('signin'); setErrorMessage(null); }}
            style={{ flex: 1, fontSize: '0.8rem' }}
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('signup'); setErrorMessage(null); }}
            style={{ flex: 1, fontSize: '0.8rem' }}
          >
            <UserPlus size={13} />
            <span>Create Account</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'demo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('demo'); setErrorMessage(null); }}
            style={{ flex: 1, fontSize: '0.8rem' }}
          >
            <Sparkles size={13} />
            <span>Demo Personas</span>
          </button>
        </div>

        {/* TAB 1: SIGN IN */}
        {activeTab === 'signin' && (
          <div>
            {/* Google Sign-In Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '14px',
                background: 'rgba(255,255,255,0.08)',
                fontWeight: 600,
                fontSize: '0.88rem',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or sign in with email</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  placeholder="Email address"
                  className="capture-input"
                  style={{ padding: '10px 14px 10px 34px', fontSize: '0.85rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  placeholder="Password"
                  className="capture-input"
                  style={{ padding: '10px 14px 10px 34px', fontSize: '0.85rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !email.trim() || !password.trim()}
                style={{ width: '100%', padding: '10px', marginTop: '4px' }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: CREATE ACCOUNT */}
        {activeTab === 'signup' && (
          <div>
            <form onSubmit={handleEmailSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  placeholder="Email address"
                  className="capture-input"
                  style={{ padding: '10px 14px 10px 34px', fontSize: '0.85rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  placeholder="Create password (min 6 characters)"
                  className="capture-input"
                  style={{ padding: '10px 14px 10px 34px', fontSize: '0.85rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading || !email.trim() || !password.trim()}
                style={{ width: '100%', padding: '10px', marginTop: '4px' }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: DEMO PERSONAS */}
        {activeTab === 'demo' && (
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Instant multi-tenant persona switcher for rapid hackathon testing:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'demo_user_001', name: 'Demo User (Golden Persona)', desc: 'Pre-seeded charger & conference room session' },
                { id: 'alex_executive', name: 'Alex (Executive Persona)', desc: 'Board meeting & flight travel session' },
                { id: 'judge_reviewer', name: 'Judge Reviewer', desc: 'Isolated clean slate evaluation session' },
              ].map((persona) => (
                <button
                  key={persona.id}
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderColor: currentId === persona.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: currentId === persona.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                  }}
                  onClick={() => handleSelectUser(persona.id)}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{persona.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{persona.desc}</div>
                  </div>
                  {currentId === persona.id && <Check size={16} color="var(--accent-primary)" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
