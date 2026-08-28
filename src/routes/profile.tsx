import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { BadgeCheck, MapPin, MoreVertical, Pencil, Plus, Share2, Sparkles, Upload, Loader2 } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { Chip } from '@/components/ui-bits';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api-client';
import artisanImg from '@/assets/artisan-meena.jpg';
import { toast } from 'sonner';

export const Route = createFileRoute('/profile')({
  component: Profile,
});

function Profile() {
  const { user, profile, role, loading, signOut } = useAuth();
  const [tab, setTab] = useState<'About' | 'Products' | 'Story'>('Products');
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total_products: 0,
    published_products: 0,
    pending_products: 0,
    market_opportunities: 0
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login' });
      return;
    }

    if (profile?.id) {
      setLoadingProducts(true);
      
      // Fetch products list
      api.get<any>('/products')
        .then(data => {
          setProducts(data?.items || []);
        })
        .catch(err => {
          console.error('Failed to load products:', err);
        });

      // Fetch dashboard stats
      api.get<any>('/artisans/me/dashboard')
        .then(res => {
          if (res.stats) {
            setStats(res.stats);
          }
        })
        .catch(err => {
          console.error('Failed to load dashboard stats:', err);
        })
        .finally(() => {
          setLoadingProducts(false);
        });
    }
  }, [user, profile, loading]);

  if (loading) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PhoneFrame>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const name = profile.name || user.email?.split('@')[0] || 'Artisan';
  const state = profile.state || 'Unknown';
  const district = profile.district || 'Unknown';
  const craftType = profile.craft_type || 'Crafts';

  const tabs = [
    { id: 'About', label: 'About' },
    { id: 'Products', label: `Products (${products.length})` },
    { id: 'Story', label: 'Story' }
  ] as const;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate({ to: '/login' });
  };

  return (
    <PhoneFrame>
      <div className="space-y-4 px-4 pb-8 pt-4">
        <section className="ai-surface app-card space-y-3 p-5 text-center">
          <div className="relative mx-auto w-fit">
            <img
              src={profile.profile_image || artisanImg}
              alt={name}
              width={600}
              height={600}
              className="h-28 w-28 rounded-full border-4 border-card object-cover"
            />
            <BadgeCheck className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-card text-ai" />
          </div>
          <h1 className="font-display text-3xl font-extrabold">{name}</h1>
          <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {craftType} Artisan, {district}, {state}
          </p>
          <div className="grid grid-cols-3 divide-x divide-border rounded-xl bg-secondary py-3">
            {[
              [products.length.toString(), 'Products'],
              [stats.market_opportunities?.toString() || '0', 'Matches'],
              [stats.pending_products?.toString() || '0', 'Reviewing'],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="text-xl font-extrabold text-primary">{v}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-cta text-sm py-2">
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
            <button onClick={handleSignOut} className="btn-outline text-sm py-2 text-destructive border-destructive/20 hover:bg-destructive/5">
              Sign Out
            </button>
          </div>
        </section>

        <div className="flex gap-5 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                '-mb-px border-b-2 pb-2 text-sm font-semibold ' +
                (tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'About' ? (
          <p className="app-card p-4 text-sm leading-relaxed text-muted-foreground">
            {profile.location || `${name} has been practicing ${craftType} in ${state} for several years. Her workshop supports local artisans and produces traditional, high-quality handcrafted work.`}
          </p>
        ) : tab === 'Story' ? (
          <p className="app-card p-4 text-sm leading-relaxed text-muted-foreground">
            "Every piece carries the story and effort of the artisan who shaped it. We want buyers far away to feel the cultural heritage behind our traditional craft techniques."
          </p>
        ) : (
          <div className="space-y-4">
            <Link
              to="/add"
              className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-card px-4 py-8 text-center"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                <Plus className="h-6 w-6" />
              </span>
              <span className="font-display text-xl font-bold text-primary">Add New Product</span>
              <span className="text-sm text-muted-foreground">
                Use <Sparkles className="inline h-3.5 w-3.5 text-ai" /> AI Scan to automatically
                generate product details from photos and voice descriptions.
              </span>
            </Link>

            {loadingProducts ? (
              <p className="text-center text-sm text-muted-foreground py-6">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No products listed yet.</p>
            ) : (
              products.map((p) => {
                const formattedPrice = p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : '--';
                const statusLabel = p.status.charAt(0).toUpperCase() + p.status.slice(1);
                
                return (
                  <article key={p.id} className="app-card overflow-hidden">
                    <div className="relative">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          width={800}
                          height={700}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="h-48 w-full bg-secondary flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image available</span>
                        </div>
                      )}
                      <span
                        className={
                          'absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-primary-foreground ' +
                          (p.status === 'published' ? 'bg-success' : 'bg-warning')
                        }
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <h2 className="min-w-0 truncate font-display text-lg font-bold">{p.name || 'Draft Product'}</h2>
                        <span className="shrink-0 font-extrabold text-primary">{formattedPrice}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.category && <Chip>{p.category}</Chip>}
                        {p.material && <Chip>{p.material}</Chip>}
                        {p.craft_type && <Chip>{p.craft_type}</Chip>}
                      </div>
                      
                      {p.status === 'published' ? (
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <button className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-2.5 text-sm font-semibold">
                            <Pencil className="h-4 w-4" /> Edit
                          </button>
                          <button
                            aria-label="More options"
                            className="grid w-10 place-items-center rounded-xl border border-border"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {p.status === 'review' ? (
                            <Link to="/pricing" search={{ productId: p.id }} className="btn-cta py-2.5 text-center text-sm">
                              <Upload className="h-4 w-4" /> Publish
                            </Link>
                          ) : (
                            <Link to="/review" search={{ productId: p.id }} className="btn-cta py-2.5 text-center text-sm">
                              <Sparkles className="h-4 w-4 text-yellow-300" /> AI Process
                            </Link>
                          )}
                          <Link to="/review" search={{ productId: p.id }} className="rounded-xl bg-secondary py-2.5 text-center text-sm font-semibold">
                            Edit Draft
                          </Link>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}
