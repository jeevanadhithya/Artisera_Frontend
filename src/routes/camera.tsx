import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { X, Zap, ScanLine, Sparkles, Upload, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import bambooFallback from '@/assets/product-bamboo.jpg';

export const Route = createFileRoute('/camera')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      productId: (search['productId'] as string) || '',
    };
  },
  component: CameraView,
});

function CameraView() {
  const { productId } = Route.useSearch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Camera State
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const startCamera = async (mode: 'user' | 'environment') => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video metadata to load before playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn('Video play failed:', e));
        };
      }
      setStreamActive(true);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err) {
      console.warn('Camera access failed or denied:', err);
      setCameraError('Webcam access is blocked or unavailable. Please upload an image.');
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setStreamActive(false);
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const capturePhoto = () => {
    if (videoRef.current && streamActive) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'craft_capture.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const retakePhoto = () => {
    startCamera(facingMode);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      stopCamera();
    }
  };

  const handleUploadAndEnhance = async () => {
    if (!selectedFile) {
      toast.error('Please capture or select an image first');
      return;
    }

    if (!productId) {
      toast.error('No product ID found. Please go back and try again.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.enhanceImage<any>(productId, selectedFile);
      toast.success('Image uploaded and enhanced successfully!');
      
      navigate({
        to: '/review',
        search: { productId }
      });
    } catch (error) {
      console.error('Image processing failed:', error);
      toast.error('Failed to process image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneFrame chrome={false}>
      <div className="relative min-h-screen bg-foreground overflow-hidden">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Video feed or preview image */}
        {streamActive ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
        ) : (
          <img
            src={previewUrl || bambooFallback}
            alt="Product preview"
            width={800}
            height={800}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        )}

        <div className="relative flex min-h-screen flex-col justify-between p-4 bg-gradient-to-t from-black/75 via-transparent to-black/55 z-10">
          
          {/* Top Bar Navigation */}
          <div className="flex items-start gap-3">
            <Link
              to="/add"
              aria-label="Close camera"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground/40 text-background backdrop-blur-sm hover:bg-foreground/60 transition-colors"
            >
              <X className="h-5 w-5" />
            </Link>
            
            <p className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-foreground/40 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-background backdrop-blur-sm">
              <ScanLine className="h-4 w-4 shrink-0 text-ai" /> Capture or Upload craft
            </p>
            
            <button
              onClick={triggerFileSelect}
              aria-label="Upload file"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground/40 text-background backdrop-blur-sm hover:bg-foreground/60 transition-colors"
            >
              <Upload className="h-5 w-5" />
            </button>
          </div>

          {/* Camera Error / Placeholder view */}
          {cameraError && streamActive === false && !selectedFile && (
            <div className="mx-auto max-w-[18rem] rounded-xl bg-destructive/15 border border-destructive/25 p-4 text-center space-y-2 backdrop-blur-sm">
              <AlertCircle className="h-6 w-6 text-destructive mx-auto" />
              <p className="text-xs text-background font-semibold">{cameraError}</p>
              <button 
                onClick={triggerFileSelect} 
                className="text-xs font-bold text-primary underline"
              >
                Choose from gallery instead
              </button>
            </div>
          )}

          {/* Shutter Controls */}
          <div className="space-y-4">
            <div className="flex justify-center gap-3">
              {streamActive && (
                <button
                  onClick={toggleFacingMode}
                  className="flex items-center gap-1.5 rounded-full bg-foreground/40 px-4 py-2 text-xs font-bold text-background backdrop-blur-sm hover:bg-foreground/60 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Switch Camera
                </button>
              )}
              {selectedFile && (
                <button
                  onClick={retakePhoto}
                  className="flex items-center gap-1.5 rounded-full bg-foreground/40 px-4 py-2 text-xs font-bold text-background backdrop-blur-sm hover:bg-foreground/60 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retake Photo
                </button>
              )}
            </div>

            <p className="mx-auto flex w-fit items-center gap-2 rounded-full bg-foreground/65 px-4 py-2 text-xs font-semibold text-background backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-ai" /> AI Auto-Enhance Active
            </p>
            
            <div className="flex items-center justify-between rounded-3xl bg-foreground/50 px-6 py-4 backdrop-blur-md border border-white/5">
              
              {/* Thumbnail preview */}
              <span 
                onClick={triggerFileSelect}
                className="h-11 w-11 overflow-hidden rounded-lg border border-background/40 cursor-pointer bg-secondary flex items-center justify-center shadow-sm"
              >
                <img 
                  src={previewUrl || bambooFallback} 
                  alt="Preview thumbnail" 
                  loading="lazy" 
                  width={800} 
                  height={800} 
                  className="h-full w-full object-cover" 
                />
              </span>

              {/* Shutter Capture Button / Upload Action */}
              {selectedFile ? (
                <button
                  onClick={handleUploadAndEnhance}
                  disabled={loading}
                  className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full flex items-center gap-2 hover:bg-primary/95 transition-all disabled:opacity-80 shadow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    'Enhance & Continue'
                  )}
                </button>
              ) : (
                <button
                  onClick={streamActive ? capturePhoto : triggerFileSelect}
                  className="h-16 w-16 rounded-full border-4 border-background bg-background/95 hover:bg-background active:scale-95 transition-all flex items-center justify-center shadow"
                />
              )}

              {/* Fake Flash toggle indicator */}
              <span 
                onClick={triggerFileSelect}
                className="grid h-11 w-11 place-items-center rounded-full bg-foreground/40 text-background cursor-pointer hover:bg-foreground/60 transition-colors"
              >
                <Zap className="h-5 w-5" />
              </span>

            </div>
          </div>

        </div>
      </div>
    </PhoneFrame>
  );
}
