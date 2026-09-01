import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Pencil, Sparkles, Leaf, Shield, Grid3x3, Map, Mic, Square, Loader2, Languages, Check, IndianRupee, Tag, ArrowRight, Store, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { AiBadge, PageHeader, Chip } from '@/components/ui-bits';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import bambooFallback from '@/assets/product-bamboo.jpg';

export const Route = createFileRoute('/review')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      productId: (search['productId'] as string) || '',
    };
  },
  component: Review,
});

function Review() {
  const { productId } = Route.useSearch();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Image View Mode (Enhanced vs Original)
  const [imageViewMode, setImageViewMode] = useState<'selected' | 'enhanced' | 'original'>('selected');

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Artisan Price & Cost Inputs
  const [price, setPrice] = useState<string>('500');
  const [materialCost, setMaterialCost] = useState<string>('150');
  const [laborCost, setLaborCost] = useState<string>('200');

  // AI Generation State
  const [generating, setGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState('Understanding your craft...');
  const [publishing, setPublishing] = useState(false);

  // Form State
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');
  const [craftType, setCraftType] = useState('');
  const [region, setRegion] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionHi, setDescriptionHi] = useState('');
  const [keywords, setKeywords] = useState('');

  // Multilingual Translations State
  const [translating, setTranslating] = useState(false);
  const [translations, setTranslations] = useState<any[]>([]);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('en');

  // Marketplace Export State
  const [exportPlatform, setExportPlatform] = useState<'amazon' | 'flipkart' | 'gem' | null>(null);
  const [exportPayload, setExportPayload] = useState<any | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchProductDetails = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await api.get<any>(`/products/${productId}`);
      setProduct(res);
      setTranscript(res.voice_transcript || '');

      if (res.price) setPrice(String(res.price));
      if (res.material_cost) setMaterialCost(String(res.material_cost));
      if (res.labor_cost) setLaborCost(String(res.labor_cost));

      // Seed form fields
      setName(res.name || '');
      setCategory(res.category || '');
      setMaterial(res.material || '');
      setCraftType(res.craft_type || '');
      setRegion(res.region || '');
      setDescriptionEn(res.description_en || '');
      setDescriptionHi(res.description_hi || '');
      setKeywords(res.keywords ? (Array.isArray(res.keywords) ? res.keywords.join(', ') : res.keywords) : '');

      // Fetch stored translations
      try {
        const transRes = await api.getProductTranslations(productId);
        setTranslations(transRes || []);
      } catch (tErr) {
        console.warn('Failed to load product translations:', tErr);
      }
    } catch (e) {
      console.error('Failed to load product:', e);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  // Voice recording handlers
  const recognitionRef = useRef<any>(null);
  const [liveText, setLiveText] = useState('');

  const getSupportedMimeType = (): { mimeType: string; ext: string } => {
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return { mimeType: 'audio/webm;codecs=opus', ext: 'webm' };
      if (MediaRecorder.isTypeSupported('audio/webm')) return { mimeType: 'audio/webm', ext: 'webm' };
      if (MediaRecorder.isTypeSupported('audio/mp4')) return { mimeType: 'audio/mp4', ext: 'm4a' };
      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return { mimeType: 'audio/ogg', ext: 'ogg' };
    }
    return { mimeType: 'audio/webm', ext: 'webm' };
  };

  const startRecording = async () => {
    setLiveText('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType, ext } = getSupportedMimeType();

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'hi-IN';

          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript + ' ';
            }
            if (current.trim()) {
              setLiveText(current.trim());
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (rErr) {
          console.warn('Live SpeechRecognition error:', rErr);
        }
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const cleanType = (mimeType ? mimeType.split(';')[0] : 'audio/webm') || 'audio/webm';
        const audioFile = new File([audioBlob], `voice.${ext}`, { type: cleanType });

        setTranscribing(true);
        try {
          const res = await api.uploadVoice(productId, audioFile);
          const langInfo = res.voice_language ? ` from ${res.voice_language}` : '';
          toast.success(`Voice transcribed${langInfo} & converted to English!`);
          setTranscript(res.transcript);
          await fetchProductDetails();
        } catch (e: any) {
          console.error('Voice transcription error:', e);
          if (liveText.trim()) {
            toast.info('Using live voice transcript fallback.');
            setTranscript(liveText.trim());
            await api.put(`/products/${productId}`, { voice_transcript: liveText.trim() });
            await fetchProductDetails();
          } else {
            toast.error(e?.message || 'Failed to transcribe audio. You can type details below.');
          }
        } finally {
          setTranscribing(false);
        }

      };

      mediaRecorder.start(250);
      setIsRecording(true);
      toast.info('Recording... Describe your craft in Hindi, English, or any language.');
    } catch (err) {
      console.error('Failed to access microphone:', err);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  // AI Catalog Generation Trigger
  const handleGenerateCatalog = async () => {
    setGenerating(true);
    setGeneratingMessage('Analyzing craft details...');

    const messageRotation = setInterval(() => {
      setGeneratingMessage(prev => {
        if (prev.includes('Analyzing')) return 'Structuring product description...';
        if (prev.includes('Structuring')) return 'Preparing marketplace catalog...';
        return 'Analyzing craft details...';
      });
    }, 1500);

    try {
      const numericPrice = parseFloat(price) || 500;
      await api.put(`/products/${productId}`, {
        price: numericPrice,
        material_cost: parseFloat(materialCost) || 150,
        labor_cost: parseFloat(laborCost) || 200,
        minimum_price: parseFloat(materialCost) || 150,
        maximum_price: numericPrice * 1.35,
      });

      const res = await api.post<any>(`/products/${productId}/generate-catalog`);
      toast.success('AI catalog generated successfully!');
      await fetchProductDetails();
      setEditMode(false);
    } catch (e: any) {
      console.error('Catalog generation error:', e);
      toast.error(e?.message || 'AI catalog generation failed');
    } finally {
      clearInterval(messageRotation);
      setGenerating(false);
    }
  };

  // Generate Multilingual Translations
  const handleGenerateTranslations = async () => {
    setTranslating(true);
    try {
      await api.translateProduct(productId);
      toast.success('Catalog translated into 5 Indian regional languages!');
      const transRes = await api.getProductTranslations(productId);
      setTranslations(transRes || []);
    } catch (tErr: any) {
      console.error('Translation error:', tErr);
      toast.error('Multilingual translation failed');
    } finally {
      setTranslating(false);
    }
  };

  // Save manual edits
  const handleSaveCatalog = async () => {
    try {
      const keywordsArray = keywords.split(',').map(s => s.trim()).filter(Boolean);
      await api.put(`/products/${productId}/catalog`, {
        name,
        category,
        material,
        craft_type: craftType,
        region,
        description_en: descriptionEn,
        description_hi: descriptionHi,
        keywords: keywordsArray,
        price: parseFloat(price) || 500,
      });
      toast.success('Listing details saved.');
      setEditMode(false);
      await fetchProductDetails();
    } catch (e) {
      toast.error('Failed to save changes');
    }
  };

  // Marketplace Export Preview Trigger
  const handleOpenExport = async (platform: 'amazon' | 'flipkart' | 'gem') => {
    setExportPlatform(platform);
    setExportLoading(true);
    try {
      const payload = await api.exportMarketplace(productId, platform);
      setExportPayload(payload);
    } catch (err: any) {
      console.error('Export generation failed:', err);
      toast.error(`Failed to generate ${platform.toUpperCase()} export data`);
    } finally {
      setExportLoading(false);
    }
  };

  // Submit & Publish to Marketplace
  const handlePublish = async () => {
    setPublishing(true);
    try {
      if (editMode) {
        await handleSaveCatalog();
      }

      await api.post(`/products/${productId}/publish`);
      toast.success('🎉 Product published live to Artisera Marketplace!');
      navigate({ to: '/profile' });
    } catch (e: any) {
      console.error('Failed to publish product:', e);
      toast.error(e?.message || 'Failed to publish product. Please check details.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PhoneFrame>
    );
  }

  if (!product) {
    return (
      <PhoneFrame>
        <div className="p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Product listing not found.</p>
          <Link to="/" className="btn-cta">Go Home</Link>
        </div>
      </PhoneFrame>
    );
  }

  // Determine which image to display
  let displayedImageUrl = product.selected_image_url || product.primary_image_url || product.enhanced_image_url || product.image_url || product.original_image_url || bambooFallback;
  if (imageViewMode === 'enhanced' && product.enhanced_image_url) {
    displayedImageUrl = product.enhanced_image_url;
  } else if (imageViewMode === 'original' && product.original_image_url) {
    displayedImageUrl = product.original_image_url;
  }

  const hasEnhanced = Boolean(product.enhanced_image_url);
  const hasOriginal = Boolean(product.original_image_url);
  const hasMediaForAI = displayedImageUrl || transcript;
  const formattedPrice = price ? `₹${Number(price).toLocaleString('en-IN')}` : '₹500';

  // Selected translation view if viewing non-English
  const activeTranslation = translations.find(t => t.language_code === selectedLanguageCode);

  return (
    <PhoneFrame>
      <div className="pb-8 space-y-4">
        <PageHeader title="Artisan Product Listing Studio" back="/add" />

        {/* Step Progress Bar */}
        <div className="px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center justify-between text-[10px] font-extrabold text-muted-foreground uppercase">
            <span className="text-success flex items-center gap-0.5">✓ Photo</span>
            <span className={transcript ? "text-success flex items-center gap-0.5" : "text-primary flex items-center gap-0.5"}>
              {transcript ? '✓ Voice/Text' : '● Voice/Text'}
            </span>
            <span className={price ? "text-success flex items-center gap-0.5" : "text-primary flex items-center gap-0.5"}>
              {price ? '✓ Price' : '● Price'}
            </span>
            <span className={product.ai_generated ? "text-success flex items-center gap-0.5" : "text-muted-foreground flex items-center gap-0.5"}>
              {product.ai_generated ? '✓ Preview' : '○ Preview'}
            </span>
            <span className="text-muted-foreground">○ Publish</span>
          </div>
          <div className="relative mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
              style={{ width: product.ai_generated ? '85%' : (price && transcript ? '60%' : '30%') }}
            />
          </div>
        </div>

        <div className="space-y-4 px-4">

          {/* STEP 1: Product Photo with Before/After Toggle */}
          <div className="app-card overflow-hidden p-3 bg-card border border-border space-y-2.5">
            <div className="relative overflow-hidden rounded-xl bg-neutral-900">
              <img
                src={displayedImageUrl}
                alt="Product display"
                width={800}
                height={800}
                className="h-56 w-full object-cover transition-all"
              />

              {/* Badges */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-yellow-300 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                {imageViewMode === 'original'
                  ? 'Original Photo'
                  : hasEnhanced
                  ? 'Studio Enhanced'
                  : 'Product Photo'}
              </div>

              {/* Retake Link */}
              <Link
                to="/camera"
                search={{ productId }}
                className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md hover:bg-black/80"
              >
                <ImageIcon className="h-3 w-3" /> Change Photo
              </Link>
            </div>

            {/* Toggle between Enhanced and Original if both exist */}
            {hasEnhanced && hasOriginal && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Photo View</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setImageViewMode('enhanced')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      imageViewMode === 'enhanced' || (imageViewMode === 'selected' && product.selected_image_url === product.enhanced_image_url)
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Enhanced
                  </button>
                  <button
                    onClick={() => setImageViewMode('original')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      imageViewMode === 'original' || (imageViewMode === 'selected' && product.selected_image_url === product.original_image_url)
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Description Entry (Sarvam Voice AI or Manual Typing) */}
          <div className="app-card p-4 space-y-3 bg-card border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base">1. Description (Voice in Any Language)</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[16rem]">
                  Speak in Hindi, Tamil, Telugu, Kannada, Marathi, Bengali, etc. — auto-translated to English.
                </p>
              </div>
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-2 text-xs font-bold text-destructive animate-pulse"
                >
                  <Square className="h-3.5 w-3.5 fill-destructive" /> Stop
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={transcribing}
                  className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Mic className="h-3.5 w-3.5" /> {transcript ? 'Re-record' : 'Record Voice'}
                </button>
              )}
            </div>

            {transcribing ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-4 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Transcribing & Converting to English...
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Describe your craft (e.g. Handmade Jaipur blue pottery vase with floral motifs, 10 inches tall...)"
                  className="w-full rounded-xl bg-secondary p-3 text-xs border border-border/50 outline-none resize-none text-foreground"
                />
                {transcript && (
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-success uppercase">
                    <span>✓ English Description Ready</span>
                    {product?.voice_language && (
                      <span className="text-muted-foreground font-semibold normal-case">
                        Spoken in: {product.voice_language}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>


          {/* STEP 3: Selling Price & Cost Breakdown */}
          <div className="app-card p-4 space-y-3 bg-card border border-border">
            <div>
              <h3 className="font-display font-bold text-base flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-primary" /> 2. Price & Cost
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Enter your target price and cost breakdown for AI catalog optimization.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Selling Price</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl bg-secondary pl-6 pr-2 py-2 text-xs font-extrabold text-primary border border-border/50 outline-none"
                    placeholder="500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Material Cost</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value)}
                    className="w-full rounded-xl bg-secondary pl-6 pr-2 py-2 text-xs border border-border/50 outline-none"
                    placeholder="150"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Labor Cost</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">₹</span>
                  <input
                    type="number"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="w-full rounded-xl bg-secondary pl-6 pr-2 py-2 text-xs border border-border/50 outline-none"
                    placeholder="200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: AI Generator Action */}
          {!product.ai_generated && (
            <div className="rounded-2xl bg-gradient-to-br from-ai/15 via-card to-card p-4 border border-ai/30 space-y-3 text-center shadow-sm">
              <p className="text-xs font-semibold text-foreground">
                {generating ? generatingMessage : 'Photo, description, and price captured. Generate your full marketplace catalog page with AI.'}
              </p>
              <button
                onClick={handleGenerateCatalog}
                disabled={generating || !hasMediaForAI}
                className="btn-cta w-full py-3.5 flex items-center justify-center gap-2 font-bold shadow-md"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {generatingMessage}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-yellow-300" /> Generate Product Catalog Page
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 5: Full Product Page Preview & Review */}
          {product.ai_generated && (
            <div className="app-card space-y-4 p-4 border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <AiBadge>Marketplace Page Preview</AiBadge>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1">Review your product listing before publishing</p>
                </div>
                {editMode ? (
                  <button
                    onClick={handleSaveCatalog}
                    className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success hover:bg-success/20"
                  >
                    <Check className="h-3.5 w-3.5" /> Save Changes
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground hover:bg-secondary-foreground/10"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit Page
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-3 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Product Title</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-xs font-bold border border-border/40 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Price (₹)</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-xs font-bold border border-border/40 outline-none text-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Category</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Material</label>
                      <input
                        type="text"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Craft Type</label>
                      <input
                        type="text"
                        value={craftType}
                        onChange={(e) => setCraftType(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Description (English)</label>
                    <textarea
                      rows={3}
                      value={descriptionEn}
                      onChange={(e) => setDescriptionEn(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Description (Hindi)</label>
                    <textarea
                      rows={3}
                      value={descriptionHi}
                      onChange={(e) => setDescriptionHi(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-xs border border-border/40 outline-none resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Title & Price Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <div>
                      <h2 className="font-display text-xl font-extrabold leading-tight text-foreground">{product.name}</h2>
                      <span className="inline-block mt-1 text-xs font-bold text-success">In Stock • Verified Artisan Listing</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-primary">{formattedPrice}</span>
                      <p className="text-[10px] text-muted-foreground">Includes taxes</p>
                    </div>
                  </div>

                  {/* Specification Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Category', value: product.category, icon: Leaf },
                      { label: 'Material', value: product.material, icon: Shield },
                      { label: 'Craft Type', value: product.craft_type, icon: Grid3x3 },
                      { label: 'Region', value: product.region, icon: Map },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-xl bg-secondary/70 p-2.5 border border-border/30">
                        <p className="text-[9px] uppercase font-extrabold tracking-wide text-muted-foreground">{label}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold truncate">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" /> {value || '--'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Multilingual Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Languages className="h-3.5 w-3.5 text-ai" /> Multilingual Catalog
                      </span>
                      {translations.length === 0 && (
                        <button
                          onClick={handleGenerateTranslations}
                          disabled={translating}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Generate Indian Languages
                        </button>
                      )}
                    </div>

                    {translations.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                        {['en', 'hi', 'ta', 'te', 'bn', 'mr'].map((code) => {
                          const labels: Record<string, string> = { en: 'English', hi: 'हिन्दी', ta: 'தமிழ்', te: 'తెలుగు', bn: 'বাংলা', mr: 'मराठी' };
                          const hasTrans = code === 'en' || translations.some(t => t.language_code === code);
                          if (!hasTrans) return null;
                          return (
                            <button
                              key={code}
                              onClick={() => setSelectedLanguageCode(code)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                selectedLanguageCode === code
                                  ? 'bg-ai text-ai-foreground shadow-xs'
                                  : 'bg-secondary text-muted-foreground'
                              }`}
                            >
                              {labels[code] || code}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Active Language Description */}
                    <div className="rounded-xl bg-secondary/50 p-3 border border-border/30">
                      <p className="text-xs leading-relaxed text-foreground">
                        {selectedLanguageCode === 'en'
                          ? (product.description_en || 'Handcrafted artisan item.')
                          : (activeTranslation?.description || product.description_hi || product.description_en)}
                      </p>
                    </div>
                  </div>

                  {product.keywords && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(Array.isArray(product.keywords) ? product.keywords : String(product.keywords).split(',')).map((kw: string) => (
                        <Chip key={kw}>{kw.trim()}</Chip>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Marketplace B2B Exports */}
          {product.ai_generated && (
            <div className="app-card p-4 bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm">Marketplace Export Adapters</h4>
                  <p className="text-[10px] text-muted-foreground">Export catalog metadata ready for e-commerce platforms.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleOpenExport('amazon')}
                  className="p-3 rounded-xl bg-secondary border border-border/50 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors"
                >
                  <span className="text-xs font-black text-foreground">Amazon</span>
                  <span className="text-[9px] text-muted-foreground">Ready</span>
                </button>

                <button
                  onClick={() => handleOpenExport('flipkart')}
                  className="p-3 rounded-xl bg-secondary border border-border/50 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors"
                >
                  <span className="text-xs font-black text-foreground">Flipkart</span>
                  <span className="text-[9px] text-muted-foreground">Samarth</span>
                </button>

                <button
                  onClick={() => handleOpenExport('gem')}
                  className="p-3 rounded-xl bg-secondary border border-border/50 flex flex-col items-center gap-1 hover:border-primary/40 transition-colors"
                >
                  <span className="text-xs font-black text-foreground">GeM Portal</span>
                  <span className="text-[9px] text-muted-foreground">Govt / Tribal</span>
                </button>
              </div>

              {/* Export Modal / Viewer */}
              {exportPlatform && (
                <div className="p-3 rounded-xl bg-secondary/80 border border-primary/20 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold uppercase text-primary text-[10px]">
                      {exportPlatform.toUpperCase()} Export Payload
                    </span>
                    <button
                      onClick={() => setExportPlatform(null)}
                      className="text-muted-foreground hover:text-foreground text-[10px] font-bold"
                    >
                      Close
                    </button>
                  </div>

                  {exportLoading ? (
                    <div className="py-4 flex justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : exportPayload ? (
                    <div className="space-y-1.5">
                      <p><strong>SKU:</strong> {exportPayload.sku}</p>
                      <p><strong>MRP:</strong> ₹{exportPayload.price?.mrp} | <strong>Listing Price:</strong> ₹{exportPayload.price?.listingPrice}</p>
                      <p className="text-[10px] text-muted-foreground truncate"><strong>Main Image:</strong> {exportPayload.images?.mainImage}</p>
                      <div className="pt-1">
                        <span className="text-[9px] font-bold text-success uppercase">✓ Fully Formatted</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* STEP 7: Final Action Buttons */}
          {product.ai_generated && (
            <div className="space-y-3 pt-2">
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="btn-cta w-full py-4 flex items-center justify-center gap-2 font-black text-base shadow-lg hover:scale-[1.01] transition-all"
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Publishing to Marketplace...
                  </>
                ) : (
                  <>
                    <Store className="h-5 w-5" /> Submit & Publish Product to Marketplace
                  </>
                )}
              </button>

              <button
                onClick={handleGenerateCatalog}
                disabled={generating}
                className="w-full py-3 bg-secondary text-muted-foreground hover:text-foreground rounded-2xl text-xs font-bold border border-border/40 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Re-generate Catalog Details with AI
              </button>
            </div>
          )}

        </div>
      </div>
    </PhoneFrame>
  );
}
