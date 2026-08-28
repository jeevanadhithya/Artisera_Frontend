import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Pencil, Sparkles, Leaf, Shield, Grid3x3, Map, Mic, Square, Loader2, Languages, Check } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { AiBadge, PageHeader, Chip } from '@/components/ui-bits';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import bambooFallback from '@/assets/product-bamboo.jpg';

export const Route = createFileRoute('/review')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      productId: (search.productId as string) || '',
    };
  },
  component: Review,
});

function Review() {
  const { productId } = Route.useSearch();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // AI Generation State
  const [generating, setGenerating] = useState(false);

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

  const fetchProductDetails = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await api.get<any>(`/products/${productId}`);
      setProduct(res);
      setTranscript(res.voice_transcript || '');
      
      // Seed form fields
      setName(res.name || '');
      setCategory(res.category || '');
      setMaterial(res.material || '');
      setCraftType(res.craft_type || '');
      setRegion(res.region || '');
      setDescriptionEn(res.description_en || '');
      setDescriptionHi(res.description_hi || '');
      setKeywords(res.keywords ? (Array.isArray(res.keywords) ? res.keywords.join(', ') : res.keywords) : '');
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
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'voice.wav', { type: 'audio/wav' });
        
        setTranscribing(true);
        try {
          const res = await api.uploadVoice<any>(productId, audioFile);
          toast.success('Voice description transcribed successfully!');
          setTranscript(res.transcript);
          // Trigger reload
          await fetchProductDetails();
        } catch (e) {
          toast.error('Failed to transcribe audio. Try typing details manually.');
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Recording... Describe your craft (material, colors, size)');
    } catch (err) {
      console.error('Failed to access microphone:', err);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  // AI Catalog Generator Trigger
  const [generatingMessage, setGeneratingMessage] = useState('Understanding your craft...');
  
  const handleGenerateCatalog = async () => {
    setGenerating(true);
    setGeneratingMessage('Understanding your craft...');
    
    const messageRotation = setInterval(() => {
      setGeneratingMessage(prev => {
        if (prev.includes('Understanding')) return 'Creating your product description...';
        if (prev.includes('Creating')) return 'Preparing your marketplace listing...';
        return 'Understanding your craft...';
      });
    }, 1500);

    try {
      const res = await api.post<any>(`/products/${productId}/generate-catalog`);
      toast.success('AI catalog generated successfully!');
      await fetchProductDetails();
      setEditMode(false);
    } catch (e: any) {
      toast.error(e.message || 'AI generation failed');
    } finally {
      clearInterval(messageRotation);
      setGenerating(false);
    }
  };

  // Save edits
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
      });
      toast.success('Listing details saved.');
      setEditMode(false);
      // Reload details
      await fetchProductDetails();
    } catch (e) {
      toast.error('Failed to save changes');
    }
  };

  const handleApprove = async () => {
    // If details are saved, proceed to pricing
    if (editMode) {
      await handleSaveCatalog();
    }
    navigate({
      to: '/pricing',
      search: { productId }
    });
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
          <p className="text-sm text-muted-foreground">Product not found.</p>
          <Link to="/" className="btn-cta">Go Home</Link>
        </div>
      </PhoneFrame>
    );
  }

  const hasMediaForAI = product.image_url || transcript;
  const imageUrl = product.image_url || product.original_image_url || bambooFallback;

  return (
    <PhoneFrame>
      <div className="pb-8">
        <PageHeader title="AI Catalog Review" back="/add" />
        
        {/* Step Progress Indicator */}
        <div className="px-4 py-3.5 border-b border-border bg-card">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span className="text-success flex items-center gap-0.5">✓ 1 Photo</span>
            <span className={transcript ? "text-success flex items-center gap-0.5" : "text-primary flex items-center gap-0.5"}>
              {transcript ? '✓' : '●'} 2 Voice
            </span>
            <span className={product.ai_generated ? "text-success flex items-center gap-0.5" : "text-muted-foreground flex items-center gap-0.5"}>
              {product.ai_generated ? '✓' : '○'} 3 Catalog
            </span>
            <span className="text-muted-foreground">○ 4 Price</span>
            <span className="text-muted-foreground">○ 5 Publish</span>
          </div>
          <div className="relative mt-2.5 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
              style={{ width: product.ai_generated ? '60%' : (transcript ? '40%' : '20%') }}
            />
          </div>
        </div>

        <div className="space-y-5 px-4 pt-3">
          
          {/* Enhanced Image Display */}
          <div className="app-card overflow-hidden p-3 bg-card border border-border">
            <div className="relative overflow-hidden rounded-xl">
              <img
                src={imageUrl}
                alt="Product preview"
                width={800}
                height={800}
                className="h-56 w-full object-cover"
              />
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-yellow-300">
                <Sparkles className="h-3.5 w-3.5" /> {product.enhanced_image_url ? 'AI Enhanced' : 'Product Photo'}
              </span>
            </div>
          </div>

          {/* Voice Entry / Transcript Section */}
          <div className="app-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base">Voice Description</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[15rem]">
                  Speak naturally. Tell us what the product is made of, where it is made, its size, craft style and anything special about it.
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
                  <Mic className="h-3.5 w-3.5" /> {transcript ? 'Re-record' : 'Record'}
                </button>
              )}
            </div>

            {transcribing ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Transcribing audio description...
              </div>
            ) : transcript ? (
              <div className="space-y-2">
                <div className="rounded-xl bg-secondary p-3.5 text-sm text-muted-foreground italic border border-border/40">
                  "{transcript}"
                </div>
                <div className="flex justify-end gap-2 text-[10px] font-extrabold text-success uppercase">
                  <span>✓ Transcribed</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 bg-secondary/40 rounded-xl">
                No voice transcription. Record description above to generate catalog details automatically.
              </p>
            )}
          </div>

          {/* AI Generator Action Panel */}
          {!product.ai_generated && (
            <div className="rounded-2xl bg-ai-soft p-4 border border-ai/20 space-y-3 text-center">
              <p className="text-xs font-semibold text-ai-foreground">
                {generating ? generatingMessage : 'Photo and voice description captured. Trigger AI listing generation to construct the full metadata.'}
              </p>
              <button
                onClick={handleGenerateCatalog}
                disabled={generating || !hasMediaForAI}
                className="btn-cta w-full py-3.5 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {generatingMessage}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Create My Product Listing
                  </>
                )}
              </button>
            </div>
          )}

          {/* Catalog Metadata Form */}
          {product.ai_generated && (
            <div className="app-card space-y-4 p-4 border border-border">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <AiBadge>AI Generated Catalog (Conf: {Math.round((product.ai_confidence || 0.9) * 100)}%)</AiBadge>
                {editMode ? (
                  <button
                    onClick={handleSaveCatalog}
                    className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success hover:bg-success/20"
                  >
                    <Check className="h-3.5 w-3.5" /> Save
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground hover:bg-secondary-foreground/10"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-3.5 text-left">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Product Title</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/40 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Category</label>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/40 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Material</label>
                      <input
                        type="text"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/40 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Craft Type</label>
                      <input
                        type="text"
                        value={craftType}
                        onChange={(e) => setCraftType(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/40 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Region</label>
                      <input
                        type="text"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/40 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Description (English)</label>
                    <textarea
                      rows={3}
                      value={descriptionEn}
                      onChange={(e) => setDescriptionEn(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/40 outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Description (Hindi)</label>
                    <textarea
                      rows={3}
                      value={descriptionHi}
                      onChange={(e) => setDescriptionHi(e.target.value)}
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/40 outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Keywords (comma separated)</label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="bamboo, eco, weaving"
                      className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/40 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="font-display text-2xl font-extrabold leading-tight">{product.name}</h2>
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      {[
                        { label: 'Category', value: product.category, icon: Leaf },
                        { label: 'Material', value: product.material, icon: Shield },
                        { label: 'Craft Type', value: product.craft_type, icon: Grid3x3 },
                        { label: 'Region', value: product.region, icon: Map },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-xl bg-secondary p-3 border border-border/30">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold truncate">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-ai" /> {value || '--'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <div className="rounded-xl bg-secondary/50 p-3 border border-border/20">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">English Description</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{product.description_en || 'No English description generated.'}</p>
                    </div>

                    <div className="rounded-xl bg-secondary/50 p-3 border border-border/20">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Languages className="h-3 w-3 text-ai" /> Hindi Description</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{product.description_hi || 'Hindi Translation not available.'}</p>
                    </div>
                  </div>

                  {product.keywords && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(Array.isArray(product.keywords) ? product.keywords : product.keywords.split(',')).map((kw: string) => (
                        <Chip key={kw}>{kw.trim()}</Chip>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleApprove}
              disabled={!product.ai_generated}
              className="btn-cta w-full py-3.5 flex items-center justify-center gap-2 font-bold disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve & Set Pricing
            </button>
            
            {product.ai_generated && !editMode && (
              <button
                onClick={handleGenerateCatalog}
                disabled={generating}
                className="btn-outline w-full py-3 flex items-center justify-center gap-2 font-semibold"
              >
                <Sparkles className="h-4 w-4" /> Re-generate with AI
              </button>
            )}
          </div>

        </div>
      </div>
    </PhoneFrame>
  );
}
