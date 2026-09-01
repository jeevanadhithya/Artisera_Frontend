import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Upload, Loader2, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, Camera as CameraIcon, RotateCw } from 'lucide-react';
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

type FlowState = 'capture' | 'uploading' | 'original_preview' | 'enhancing' | 'comparison' | 'error';

function CameraView() {
  const { productId } = Route.useSearch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Flow State
  const [flowState, setFlowState] = useState<FlowState>('capture');
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [loading, setLoading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // Image IDs and URLs
  const [imageId, setImageId] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [enhancedImageUrl, setEnhancedImageUrl] = useState<string | null>(null);

  // Enhancing Progress Stages
  const [enhanceStage, setEnhanceStage] = useState<'analyzing' | 'improving' | 'preparing'>('analyzing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera Management
  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn('Video play failed:', e));
        };
      }
      setStreamActive(true);
    } catch (err) {
      console.warn('Camera access unavailable:', err);
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
    if (flowState === 'capture') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, flowState]);

  useEffect(() => {
    if (streamActive && videoRef.current && mediaStreamRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    }
  }, [streamActive]);

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Upload original image to backend
  const handleProcessFile = async (file: File) => {
    if (!productId) {
      toast.error('Product ID missing. Initializing new craft listing...');
      navigate({ to: '/add' });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(localUrl);
    setFlowState('uploading');
    setLoading(true);

    try {
      const res = await api.uploadProductImage(productId, file);
      setImageId(res.imageId);
      setOriginalImageUrl(res.originalImageUrl);
      setFlowState('original_preview');
      toast.success('Original photo uploaded successfully.');
    } catch (error: any) {
      console.error('Upload failed:', error);
      setErrorMessage('Unable to upload image. Please try again.');
      setFlowState('error');
    } finally {
      setLoading(false);
    }
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
            const file = new File([blob], 'artisan_photo.jpg', { type: 'image/jpeg' });
            handleProcessFile(file);
          }
        }, 'image/jpeg', 0.92);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Run AI photographic enhancement
  const handleEnhance = async () => {
    if (!productId || !imageId) return;

    setFlowState('enhancing');
    setEnhanceStage('analyzing');

    const stageTimer1 = setTimeout(() => setEnhanceStage('improving'), 1400);
    const stageTimer2 = setTimeout(() => setEnhanceStage('preparing'), 2800);

    try {
      const res = await api.enhanceProductImage(productId, imageId);

      // Verify that enhanced image is valid and not identical to original
      if (!res.enhancedImageUrl || res.enhancedImageUrl === originalImageUrl) {
        throw new Error('Enhanced image was not generated.');
      }

      setEnhancedImageUrl(res.enhancedImageUrl);
      if (res.originalImageUrl) {
        setOriginalImageUrl(res.originalImageUrl);
      }
      setFlowState('comparison');
    } catch (error: any) {
      console.error('Enhancement failed:', error);
      setErrorMessage('Image enhancement is temporarily unavailable. Your original image is safe.');
      setFlowState('error');
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
    }
  };

  // Image Selection Handler (Use Enhanced or Keep Original)
  const handleSelectChoice = async (selection: 'enhanced' | 'original') => {
    if (!productId) return;
    setLoading(true);

    try {
      if (imageId) {
        await api.selectProductImage(productId, imageId, selection);
      } else {
        const fallbackUrl = selection === 'enhanced' ? enhancedImageUrl : originalImageUrl;
        await api.put(`/products/${productId}/catalog`, {
          image_url: fallbackUrl,
          primary_image_url: fallbackUrl,
          selected_image_url: fallbackUrl,
        });
      }

      toast.success(selection === 'enhanced' ? 'Enhanced photo added to catalog!' : 'Original photo saved.');
      navigate({
        to: '/review',
        search: { productId },
      });
    } catch (error) {
      console.error('Failed to save selected photo:', error);
      navigate({
        to: '/review',
        search: { productId },
      });
    } finally {
      setLoading(false);
    }
  };

  // Retry enhancement using the same existing imageId
  const handleRetry = () => {
    if (imageId) {
      handleEnhance();
    } else {
      setFlowState('capture');
    }
  };

  return (
    <PhoneFrame chrome={false}>
      <div className="relative min-h-screen bg-neutral-950 text-white overflow-hidden flex flex-col justify-between">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        {/* 1. CAMERA CAPTURE VIEW */}
        {flowState === 'capture' && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full object-cover ${streamActive ? 'block' : 'hidden'}`}
            />
            {!streamActive && (
              <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <CameraIcon className="h-14 w-14 text-neutral-600 animate-pulse" />
                <p className="text-sm font-semibold text-neutral-300">Camera preview starting...</p>
                <p className="text-xs text-neutral-500">Or choose a craft photo from your gallery below.</p>
              </div>
            )}

            <div className="relative flex min-h-screen flex-col justify-between p-4 bg-gradient-to-t from-black/90 via-transparent to-black/70 z-10">
              {/* Header */}
              <div className="flex items-center justify-between pt-2">
                <Link
                  to="/add"
                  aria-label="Close"
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
                >
                  <X className="h-5 w-5" />
                </Link>

                <span className="rounded-full bg-black/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary backdrop-blur-md">
                  Craft Photo
                </span>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
                  aria-label="Upload from gallery"
                >
                  <Upload className="h-5 w-5" />
                </button>
              </div>

              {/* Guide Framing Frame */}
              <div className="mx-auto flex flex-col items-center justify-center space-y-3">
                <div className="h-64 w-64 rounded-3xl border-2 border-dashed border-white/40 flex items-center justify-center backdrop-blur-2xs">
                  <p className="text-xs font-semibold text-white/80 bg-black/50 px-3 py-1.5 rounded-full text-center">
                    Place the product inside the frame
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-4 pb-4">
                {streamActive && (
                  <div className="flex justify-center">
                    <button
                      onClick={toggleFacingMode}
                      className="flex items-center gap-1.5 rounded-full bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-black/80"
                    >
                      <RotateCw className="h-3.5 w-3.5" /> Flip Camera
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-3xl bg-black/60 px-6 py-4 backdrop-blur-lg border border-white/10">
                  {/* Gallery Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-12 w-12 rounded-2xl bg-neutral-800 border border-white/20 flex flex-col items-center justify-center gap-0.5 hover:bg-neutral-700 active:scale-95 transition-all"
                  >
                    <Upload className="h-5 w-5 text-white" />
                  </button>

                  {/* Shutter Button */}
                  <button
                    onClick={streamActive ? capturePhoto : () => fileInputRef.current?.click()}
                    className="h-18 w-18 rounded-full border-4 border-white bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-xl flex items-center justify-center"
                    aria-label="Capture photo"
                  >
                    <div className="h-12 w-12 rounded-full bg-white/20" />
                  </button>

                  {/* Placeholder spacer */}
                  <div className="h-12 w-12" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* 2. UPLOADING ORIGINAL LOADER */}
        {flowState === 'uploading' && (
          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Upload className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-xl font-extrabold">Uploading Original Photo...</h3>
              <p className="text-xs text-neutral-400">Saving your craft photo safely to cloud storage.</p>
            </div>
          </div>
        )}

        {/* 3. ORIGINAL IMAGE PREVIEW */}
        {flowState === 'original_preview' && (
          <>
            <img
              src={originalImageUrl || localPreviewUrl || bambooFallback}
              alt="Uploaded craft"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="relative flex min-h-screen flex-col justify-between p-4 bg-gradient-to-t from-black/90 via-transparent to-black/50 z-10">
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setFlowState('capture')}
                  className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md"
                >
                  <X className="h-5 w-5" />
                </button>
                <span className="rounded-full bg-black/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  Photo Uploaded
                </span>
                <div className="w-11" />
              </div>

              <div className="space-y-3 pb-4">
                <button
                  onClick={handleEnhance}
                  disabled={loading}
                  className="btn-cta w-full py-4.5 flex items-center justify-center gap-2 font-extrabold text-base shadow-xl active:scale-[0.99]"
                >
                  <Sparkles className="h-5 w-5 text-yellow-300" /> Enhance Image
                </button>

                <button
                  onClick={() => handleSelectChoice('original')}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-neutral-900/90 text-neutral-200 font-bold border border-white/10 backdrop-blur-md hover:bg-neutral-800 active:scale-[0.99]"
                >
                  Keep Original Photo
                </button>
              </div>
            </div>
          </>
        )}

        {/* 4. ENHANCING PROGRESSIVE LOADER */}
        {flowState === 'enhancing' && (
          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-6 bg-neutral-950">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="absolute inset-0 m-auto h-10 w-10 text-primary animate-pulse" />
            </div>

            <div className="space-y-2 max-w-xs">
              <h3 className="font-display text-xl font-extrabold text-white">
                {enhanceStage === 'analyzing' && 'Analyzing product...'}
                {enhanceStage === 'improving' && 'Improving image...'}
                {enhanceStage === 'preparing' && 'Preparing marketplace photo...'}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {enhanceStage === 'analyzing' && 'Inspecting lighting, craft details, and composition.'}
                {enhanceStage === 'improving' && 'Balancing brightness, contrast, and craft surface texture.'}
                {enhanceStage === 'preparing' && 'Centering product and applying studio neutral background.'}
              </p>
            </div>

            {/* Stage Indicator Dots */}
            <div className="flex gap-2">
              <div className={`h-2 w-8 rounded-full transition-all duration-300 ${enhanceStage === 'analyzing' ? 'bg-primary' : 'bg-neutral-800'}`} />
              <div className={`h-2 w-8 rounded-full transition-all duration-300 ${enhanceStage === 'improving' ? 'bg-primary' : 'bg-neutral-800'}`} />
              <div className={`h-2 w-8 rounded-full transition-all duration-300 ${enhanceStage === 'preparing' ? 'bg-primary' : 'bg-neutral-800'}`} />
            </div>
          </div>
        )}

        {/* 5. BEFORE / AFTER COMPARISON */}
        {flowState === 'comparison' && (
          <div className="flex-1 flex flex-col justify-between p-4 bg-neutral-900 text-white min-h-screen">
            <div className="text-center pt-2 space-y-1">
              <h2 className="font-display text-xl font-black flex items-center justify-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-primary" /> Photo Result
              </h2>
              <p className="text-xs text-neutral-400">Choose which photo to use on your marketplace listing</p>
            </div>

            {/* Before / After Grid */}
            <div className="grid grid-cols-2 gap-3 py-4">
              {/* BEFORE */}
              <div className="space-y-2 text-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                  BEFORE (Original)
                </span>
                <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-950 shadow-md">
                  <img
                    src={originalImageUrl || bambooFallback}
                    alt="Original craft photo"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* AFTER */}
              <div className="space-y-2 text-center">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" /> AFTER (Enhanced)
                </span>
                <div className="aspect-[4/5] rounded-2xl overflow-hidden border-2 border-primary bg-neutral-950 shadow-xl ring-4 ring-primary/20">
                  <img
                    src={enhancedImageUrl || bambooFallback}
                    alt="Enhanced craft photo"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pb-4">
              <button
                onClick={() => handleSelectChoice('enhanced')}
                disabled={loading}
                className="btn-cta w-full py-4 flex items-center justify-center gap-2 font-black text-base shadow-xl active:scale-[0.99]"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Use Enhanced Photo
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSelectChoice('original')}
                  disabled={loading}
                  className="py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs border border-white/10"
                >
                  Keep Original
                </button>

                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-primary font-bold text-xs border border-primary/30 flex items-center justify-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. ERROR FALLBACK VIEW */}
        {flowState === 'error' && (
          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center space-y-5 bg-neutral-950">
            <div className="h-16 w-16 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
              <AlertCircle className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-xs">
              <h3 className="font-display text-lg font-bold text-white">Notice</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {errorMessage || 'Image enhancement is temporarily unavailable. Your original image is safe.'}
              </p>
            </div>

            <div className="w-full space-y-2.5 pt-4">
              {originalImageUrl && (
                <button
                  onClick={() => handleSelectChoice('original')}
                  className="btn-cta w-full py-3.5 font-bold"
                >
                  Keep Original Photo & Continue
                </button>
              )}

              <button
                onClick={handleRetry}
                className="w-full py-3 rounded-xl bg-neutral-800 text-neutral-200 font-bold text-xs hover:bg-neutral-700"
              >
                Try Again
              </button>

              <button
                onClick={() => setFlowState('capture')}
                className="w-full py-2.5 text-xs text-neutral-400 hover:underline"
              >
                Take New Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
