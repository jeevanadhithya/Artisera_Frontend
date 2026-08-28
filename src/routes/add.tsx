import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Camera, Mic, Image as ImageIcon, Pencil, X, ShieldAlert } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { api } from '../lib/api-client';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export const Route = createFileRoute('/add')({
  component: AddProduct,
});

function AddProduct() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const createDraftAndNavigate = async (targetRoute: '/camera' | '/review' | '/pricing') => {
    if (!user) {
      toast.error('You must be signed in to create a product');
      navigate({ to: '/login' });
      return;
    }

    // Backend also validates this, but frontend blocks interaction immediately
    if (profile?.profile_status !== 'verified') {
      toast.error('Please complete and verify your profile first.');
      return;
    }

    setLoading(true);
    try {
      const defaultPayload = {
        name: 'Untitled Craft Draft',
        status: 'draft',
      };
      
      const response = await api.post<any>('/products', defaultPayload);
      const productId = response.id;
      
      if (!productId) throw new Error('Product creation did not return an ID');

      navigate({ 
        to: targetRoute,
        search: { productId }
      });
    } catch (error: any) {
      console.error('Failed to create product draft:', error);
      toast.error(error.message || 'Failed to initialize product listing');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <PhoneFrame>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PhoneFrame>
    );
  }

  // 1. Check Profile setup and verification status
  if (profile?.profile_status !== 'verified') {
    return (
      <PhoneFrame chrome={false}>
        <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-card text-center space-y-6">
          <div className="h-16 w-16 bg-destructive/10 border border-destructive/20 text-destructive rounded-full flex items-center justify-center animate-pulse">
            <ShieldAlert className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-extrabold text-foreground">Verification Required</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Complete your profile and verification before adding a product.
            </p>
          </div>

          <div className="w-full pt-4">
            <Link
              to="/profile"
              className="btn-cta w-full py-4 text-center flex justify-center items-center font-bold text-sm"
            >
              Complete Profile
            </Link>
          </div>

          <Link
            to="/"
            className="text-xs font-bold text-muted-foreground hover:underline pt-2 block"
          >
            Cancel and Go Home
          </Link>
        </div>
      </PhoneFrame>
    );
  }

  // 2. Verified Artisan Create flow
  return (
    <PhoneFrame>
      <div className="relative flex min-h-[calc(100vh-8rem)] flex-col justify-end">
        <div className="absolute inset-0 bg-foreground/25" aria-hidden />
        <div className="relative rounded-t-3xl bg-card p-5 pb-8 shadow-[0_-10px_40px_-20px_rgba(30,20,80,0.6)]">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
          <h1 className="text-center font-display text-2xl font-extrabold">Create a Product</h1>
          <p className="mx-auto mt-1 max-w-[18rem] text-center text-sm text-muted-foreground">
            {loading ? 'Initializing draft listing...' : 'Show us what you made. AI will help with the rest.'}
          </p>

          <div className="mt-5 space-y-3">
            <button
              onClick={() => createDraftAndNavigate('/camera')}
              disabled={loading}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/60 py-6 hover:bg-secondary transition-colors"
            >
              <Camera className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">📸 Take Photo</span>
            </button>
            
            <button
              onClick={() => createDraftAndNavigate('/review')}
              disabled={loading}
              className="relative flex w-full flex-col items-center gap-2 rounded-2xl border border-border bg-secondary/60 py-6 hover:bg-secondary transition-colors"
            >
              <span className="absolute right-3 top-2 text-[11px] font-bold text-ai">✨ AI Voice</span>
              <Mic className="h-6 w-6 text-ai animate-pulse" />
              <span className="text-lg font-bold">🎙 Describe with Voice</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => createDraftAndNavigate('/camera')}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold hover:bg-secondary-foreground/5"
              >
                <ImageIcon className="h-4 w-4" /> 🖼 Choose Photo
              </button>
              <button
                onClick={() => createDraftAndNavigate('/review')}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold hover:bg-secondary-foreground/5"
              >
                <Pencil className="h-4 w-4" /> ✏️ Enter Manually
              </button>
            </div>
          </div>

          <button
            aria-label="Close"
            onClick={() => navigate({ to: '/' })}
            className="mx-auto mt-6 grid h-11 w-11 place-items-center rounded-full bg-secondary hover:bg-secondary-foreground/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}

// Dummy loader icon to prevent crash if not imported
function Loader2({ className }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${className}`} />;
}
