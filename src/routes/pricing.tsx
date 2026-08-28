import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { CheckCircle2, Info, Sparkles, TrendingUp, Loader2, IndianRupee } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { PageHeader } from '@/components/ui-bits';
import { api } from '../lib/api-client';
import { toast } from 'sonner';

export const Route = createFileRoute('/pricing')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      productId: (search.productId as string) || '',
    };
  },
  component: SmartPricing,
});

function SmartPricing() {
  const { productId } = Route.useSearch();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculator inputs
  const [materialCost, setMaterialCost] = useState<number>(150);
  const [laborCost, setLaborCost] = useState<number>(200);
  const [productionCost, setProductionCost] = useState<number>(50);
  const [marketLow, setMarketLow] = useState<number>(400);
  const [marketHigh, setMarketHigh] = useState<number>(650);
  const [demandScore, setDemandScore] = useState<number>(75);

  // Real-time calculation output
  const [pricingResult, setPricingResult] = useState<any | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      try {
        setLoading(true);
        const res = await api.get<any>(`/products/${productId}`);
        setProduct(res);
        
        // Populate inputs with defaults from product if available
        if (res.minimum_price) setMarketLow(res.minimum_price);
        if (res.maximum_price) setMarketHigh(res.maximum_price);
      } catch (e) {
        console.error('Failed to load product for pricing:', e);
        toast.error('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Hitting API for price evaluation
  const runPricingEngine = async () => {
    if (!productId) return;
    setCalculating(true);
    try {
      const queryParams = new URLSearchParams({
        material_cost: materialCost.toString(),
        labor_cost: laborCost.toString(),
        production_cost: productionCost.toString(),
        market_price_low: marketLow.toString(),
        market_price_high: marketHigh.toString(),
        demand_score: demandScore.toString(),
      });
      
      const res = await api.get<any>(`/products/${productId}/price?${queryParams.toString()}`);
      setPricingResult(res.pricing);
    } catch (e) {
      console.error('Pricing calculation failed:', e);
    } finally {
      setCalculating(false);
    }
  };

  // Recalculate whenever inputs change
  useEffect(() => {
    if (productId && !loading) {
      const delayDebounce = setTimeout(() => {
        runPricingEngine();
      }, 500); // Debounce to prevent spelling key spam
      return () => clearTimeout(delayDebounce);
    }
  }, [materialCost, laborCost, productionCost, marketLow, marketHigh, demandScore, loading, productId]);

  const handlePublish = async () => {
    if (!productId || !pricingResult) return;
    setPublishing(true);
    try {
      const recommendedPrice = pricingResult.recommended_price;
      
      // 1. Update product price details
      await api.put(`/products/${productId}`, {
        price: recommendedPrice,
        minimum_price: pricingResult.minimum_price,
        maximum_price: pricingResult.maximum_price,
      });

      // 2. Publish product
      await api.post(`/products/${productId}/publish`);
      
      toast.success('Your craft is now live on the marketplace!');
      navigate({ to: '/profile' });
    } catch (e) {
      console.error('Publishing failed:', e);
      toast.error('Could not publish product');
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

  const productionCostTotal = materialCost + laborCost + productionCost;

  return (
    <PhoneFrame>
      <PageHeader title="Smart Price Evaluation" back={`/review?productId=${productId}`} />
      <div className="space-y-4 px-4 pb-8 pt-2">

        {/* Input parameters form */}
        <section className="app-card p-4 space-y-3.5 border border-border">
          <h3 className="font-display font-bold text-sm text-primary">Pricing Parameters</h3>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Material Cost</label>
              <input
                type="number"
                value={materialCost}
                onChange={(e) => setMaterialCost(Number(e.target.value))}
                className="w-full rounded-xl bg-secondary px-2.5 py-2 text-sm border border-border/30 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Labor Cost</label>
              <input
                type="number"
                value={laborCost}
                onChange={(e) => setLaborCost(Number(e.target.value))}
                className="w-full rounded-xl bg-secondary px-2.5 py-2 text-sm border border-border/30 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Other Cost</label>
              <input
                type="number"
                value={productionCost}
                onChange={(e) => setProductionCost(Number(e.target.value))}
                className="w-full rounded-xl bg-secondary px-2.5 py-2 text-sm border border-border/30 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Market Min (Estimate)</label>
              <input
                type="number"
                value={marketLow}
                onChange={(e) => setMarketLow(Number(e.target.value))}
                className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/30 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Market Max (Estimate)</label>
              <input
                type="number"
                value={marketHigh}
                onChange={(e) => setMarketHigh(Number(e.target.value))}
                className="w-full rounded-xl bg-secondary px-3 py-2 text-sm border border-border/30 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>Demand Score: {demandScore}/100</span>
              <span className="text-ai">✨ Live Adjustment</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={demandScore}
              onChange={(e) => setDemandScore(Number(e.target.value))}
              className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </section>

        {/* Real-time price recommendation dashboard */}
        {pricingResult && (
          <section className="app-card space-y-4 p-5 bg-card border border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 h-16 w-16 bg-primary/5 rounded-bl-full flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary opacity-20" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-ai-soft px-3 py-1.5 text-xs font-bold text-ai">
                <Sparkles className="h-3.5 w-3.5" /> AI Recommended Price
              </span>
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                pricingResult.demand === 'HIGH' ? 'bg-success/10 text-success' : 
                pricingResult.demand === 'MEDIUM' ? 'bg-warning/10 text-warning' : 'bg-muted/10 text-muted'
              }`}>
                <TrendingUp className="h-3.5 w-3.5" /> Demand: {pricingResult.demand}
              </span>
            </div>
            
            <div className="flex justify-between items-baseline pt-2">
              <div className="flex items-baseline font-display text-5xl font-extrabold tracking-tight text-primary">
                <IndianRupee className="h-8 w-8 self-center text-primary" />
                {pricingResult.recommended_price}
              </div>
              <p className="text-xs text-muted-foreground font-semibold">Confidence: {Math.round(pricingResult.confidence * 100)}%</p>
            </div>

            {/* Slider track visual */}
            <div>
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
                <span>Min Safe (₹{pricingResult.minimum_price})</span>
                <span>Max (₹{pricingResult.maximum_price})</span>
              </div>
              <div className="relative mt-2.5 h-2.5 rounded-full bg-secondary">
                <div className="absolute left-[15%] right-[15%] h-2.5 rounded-full bg-primary/25" />
                <div className="absolute left-[50%] top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary border-2 border-background shadow" />
              </div>
            </div>

            {/* Margin and cost breakdown */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl bg-secondary/60 p-3 border border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Production Cost</p>
                <p className="mt-0.5 text-lg font-extrabold text-foreground">₹{productionCostTotal}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3 border border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Est. Profit Margin</p>
                <p className="mt-0.5 text-lg font-extrabold text-success">
                  ₹{pricingResult.estimated_margin} ({pricingResult.margin_percentage}%)
                </p>
              </div>
            </div>

            {/* AI Explanation bubble */}
            <p className="flex items-start gap-2 rounded-xl bg-ai-soft/50 p-3.5 text-xs text-muted-foreground border border-ai/10">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-ai" />
              <span>{pricingResult.explanation}</span>
            </p>
          </section>
        )}

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handlePublish}
            disabled={publishing || calculating || !pricingResult}
            className="btn-cta w-full py-4 flex items-center justify-center gap-2 font-bold"
          >
            {publishing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Publishing craft...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" /> Publish to Marketplace
              </>
            )}
          </button>

          <Link
            to="/profile"
            className="btn-outline w-full py-3 flex items-center justify-center font-semibold text-center"
          >
            Cancel Listing
          </Link>
        </div>
      </div>
    </PhoneFrame>
  );
}
