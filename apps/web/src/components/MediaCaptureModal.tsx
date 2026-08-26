import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, Video, Upload, X, Check, RotateCcw, Play, Square, 
  Sparkles, AlertCircle, Image as ImageIcon, Film 
} from 'lucide-react';

interface MediaCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMediaCaptured: (mediaData: { type: 'image' | 'video'; base64: string; mimeType: string }) => void;
}

export const MediaCaptureModal: React.FC<MediaCaptureModalProps> = ({
  isOpen,
  onClose,
  onMediaCaptured,
}) => {
  const [activeMode, setActiveMode] = useState<'photo' | 'video' | 'upload'>('photo');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Start Camera Stream when modal opens in photo or video mode
  useEffect(() => {
    if (!isOpen || activeMode === 'upload') {
      stopCameraStream();
      return;
    }

    startCameraStream();

    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeMode]);

  const startCameraStream = async () => {
    stopCameraStream();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: activeMode === 'video',
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Unable to access camera or microphone. You can still upload photos or videos below.');
    }
  };

  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 1. Take Snapshot Photo
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(base64);
    }
  };

  // 2. Start Video Recording
  const handleStartRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];
    setRecordingSeconds(0);

    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
    const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';

    try {
      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const mime = recorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setCapturedVideo({ url, base64, mimeType: mime });
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 15) {
            handleStopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      setCameraError('Video recording is not supported on this browser device.');
    }
  };

  // 3. Stop Video Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // 4. Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const isVideo = file.type.startsWith('video');
        if (isVideo) {
          setCapturedVideo({
            url: URL.createObjectURL(file),
            base64,
            mimeType: file.type,
          });
        } else {
          setCapturedImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Confirm Selection
  const handleConfirm = () => {
    if (capturedImage) {
      onMediaCaptured({
        type: 'image',
        base64: capturedImage,
        mimeType: 'image/jpeg',
      });
      handleClose();
    } else if (capturedVideo) {
      onMediaCaptured({
        type: 'video',
        base64: capturedVideo.base64,
        mimeType: capturedVideo.mimeType,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    stopCameraStream();
    setCapturedImage(null);
    setCapturedVideo(null);
    setIsRecording(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="ask-drawer-overlay" onClick={handleClose}>
      <div
        className="capture-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          margin: 'auto',
          animation: 'slideDown 0.2s ease',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
          padding: '20px',
          zIndex: 1500,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="logo-badge" style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Camera size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Photo & Video Memory Capture</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Gemini Multimodal AI analysis
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-icon btn-sm" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeMode === 'photo' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveMode('photo');
              setCapturedImage(null);
              setCapturedVideo(null);
            }}
            style={{ flex: 1, fontSize: '0.8rem' }}
          >
            <Camera size={14} />
            <span>📸 Snap Photo</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeMode === 'video' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveMode('video');
              setCapturedImage(null);
              setCapturedVideo(null);
            }}
            style={{ flex: 1, fontSize: '0.8rem' }}
          >
            <Video size={14} />
            <span>🎥 Record Video</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveMode('upload');
              setCapturedImage(null);
              setCapturedVideo(null);
            }}
            style={{ flex: 1, fontSize: '0.8rem' }}
          >
            <Upload size={14} />
            <span>📁 Upload File</span>
          </button>
        </div>

        {/* Camera Error Message */}
        {cameraError && activeMode !== 'upload' && (
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertCircle size={15} />
            <span>{cameraError}</span>
          </div>
        )}

        {/* VIEWPORT: Camera / Preview Canvas */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '280px',
            background: '#090d16',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          {/* Live Video Feed */}
          {activeMode !== 'upload' && !capturedImage && !capturedVideo && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {/* Captured Photo Preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured memory"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}

          {/* Captured Video Preview */}
          {capturedVideo && (
            <video
              src={capturedVideo.url}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}

          {/* File Upload Screen */}
          {activeMode === 'upload' && !capturedImage && !capturedVideo && (
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                width: '100%',
                height: '100%',
                padding: '20px',
              }}
            >
              <Upload size={36} color="var(--accent-primary)" style={{ marginBottom: '10px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '4px' }}>
                Click to browse photo or video
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supports JPG, PNG, WEBM, MP4 (Max 15MB)
              </div>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}

          {/* Live Recording Indicator */}
          {isRecording && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(239, 68, 68, 0.9)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'pulse 1s infinite',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
              <span>REC 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:15</span>
            </div>
          )}
        </div>

        {/* ACTION CONTROLS */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Retake / Reset Button */}
          {(capturedImage || capturedVideo) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setCapturedImage(null);
                setCapturedVideo(null);
                if (activeMode !== 'upload') startCameraStream();
              }}
            >
              <RotateCcw size={13} />
              <span>Retake</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            {/* Snap Photo Trigger */}
            {activeMode === 'photo' && !capturedImage && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSnapPhoto}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '8px 20px' }}
              >
                <Camera size={16} />
                <span>Snap Photo</span>
              </button>
            )}

            {/* Video Recording Controls */}
            {activeMode === 'video' && !capturedVideo && (
              <>
                {!isRecording ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleStartRecording}
                    style={{ padding: '8px 20px', background: '#ef4444' }}
                  >
                    <Video size={16} />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleStopRecording}
                    style={{ padding: '8px 20px', borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    <Square size={16} />
                    <span>Stop Recording</span>
                  </button>
                )}
              </>
            )}

            {/* Attach & Confirm Media */}
            {(capturedImage || capturedVideo) && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', padding: '8px 20px' }}
              >
                <Check size={16} />
                <span>Attach to Memory</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
