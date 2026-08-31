import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { useAuth } from './useAuth';
import { User } from '@supabase/supabase-js';

// Cache timing constants
const STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes fresh
const GC_TIME_MS = 1000 * 60 * 30; // 30 minutes in memory

/**
 * 1. Dashboard Metrics for Artisans (/artisans/me/dashboard)
 */
export function useDashboardStatsQuery() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      const res = await api.get<any>('/artisans/me/dashboard');
      return res.stats || {
        total_products: 0,
        published_products: 0,
        pending_products: 0,
        market_opportunities: 0,
      };
    },
    enabled: !!user && role === 'artisan',
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

/**
 * 2. B2B Sourcing Requests for Buyers (/buyers/requests)
 */
export function useBuyerRequestsQuery() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ['buyer-requests', user?.id],
    queryFn: async () => {
      const res = await api.get<any>('/buyers/requests');
      return res.items || [];
    },
    enabled: !!user && role === 'buyer',
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

/**
 * 3. Artisan's Own Products (/products)
 */
export function useArtisanProductsQuery() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ['artisan-products', user?.id],
    queryFn: async () => {
      const res = await api.get<any>('/products');
      return res.items || [];
    },
    enabled: !!user && role === 'artisan',
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

/**
 * 4. Matching B2B Opportunities / Leads (/market/opportunities/me)
 */
export function useOpportunitiesQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['opportunities', user?.id],
    queryFn: async () => {
      const res = await api.get<any>('/market/opportunities/me');
      return res.opportunities || [];
    },
    enabled: !!user,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

/**
 * 5. User Wishlist (/wishlist)
 */
export function useWishlistQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      const res = await api.get<any[]>('/wishlist');
      return res || [];
    },
    enabled: !!user,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

/**
 * 6. Marketplace Products Query with filters (/market/products)
 */
export function useMarketProductsQuery(searchTerm: string = '', selectedCategory: string | null = null, limit?: number) {
  return useQuery({
    queryKey: ['market-products', searchTerm, selectedCategory, limit],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      if (selectedCategory) queryParams.append('category', selectedCategory);
      if (limit) queryParams.append('limit', limit.toString());

      const res = await api.get<any>(`/market/products?${queryParams.toString()}`);
      return res.items || [];
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}

/**
 * 7. Optimistic Wishlist Mutation
 */
export function useToggleWishlistMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ productId, isStarred }: { productId: string; isStarred: boolean }) => {
      if (isStarred) {
        await api.delete(`/wishlist/${productId}`);
      } else {
        await api.post('/wishlist', { product_id: productId });
      }
      return { productId, isStarred };
    },
    onMutate: async ({ productId, isStarred }) => {
      if (!user) return;
      await queryClient.cancelQueries({ queryKey: ['wishlist', user.id] });

      const previousWishlist = queryClient.getQueryData<any[]>(['wishlist', user.id]) || [];

      let nextWishlist: any[];
      if (isStarred) {
        nextWishlist = previousWishlist.filter((item) => (item.id || item.product_id) !== productId);
      } else {
        nextWishlist = [...previousWishlist, { id: productId, product_id: productId }];
      }

      queryClient.setQueryData(['wishlist', user.id], nextWishlist);

      return { previousWishlist };
    },
    onError: (_err, _variables, context) => {
      if (user && context?.previousWishlist) {
        queryClient.setQueryData(['wishlist', user.id], context.previousWishlist);
      }
    },
    onSettled: () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['wishlist', user.id] });
      }
    },
  });
}

/**
 * Helper to parallel-prefetch essential user data after login
 */
export async function prefetchEssentialUserData(queryClient: QueryClient, user: User, role: string) {
  if (!user) return;

  const prefetchPromises = [
    // 1. Opportunities & Leads
    queryClient.prefetchQuery({
      queryKey: ['opportunities', user.id],
      queryFn: async () => {
        const res = await api.get<any>('/market/opportunities/me');
        return res.opportunities || [];
      },
      staleTime: STALE_TIME_MS,
    }),
    // 2. Marketplace top summary
    queryClient.prefetchQuery({
      queryKey: ['market-products', '', null, 4],
      queryFn: async () => {
        const res = await api.get<any>('/market/products?limit=4');
        return res.items || [];
      },
      staleTime: STALE_TIME_MS,
    }),
    // 3. User Wishlist
    queryClient.prefetchQuery({
      queryKey: ['wishlist', user.id],
      queryFn: async () => {
        const res = await api.get<any[]>('/wishlist');
        return res || [];
      },
      staleTime: STALE_TIME_MS,
    }),
  ];

  if (role === 'artisan') {
    prefetchPromises.push(
      // 4. Artisan Dashboard metrics
      queryClient.prefetchQuery({
        queryKey: ['dashboard-stats', user.id],
        queryFn: async () => {
          const res = await api.get<any>('/artisans/me/dashboard');
          return res.stats || {
            total_products: 0,
            published_products: 0,
            pending_products: 0,
            market_opportunities: 0,
          };
        },
        staleTime: STALE_TIME_MS,
      }),
      // 5. Artisan Products list
      queryClient.prefetchQuery({
        queryKey: ['artisan-products', user.id],
        queryFn: async () => {
          const res = await api.get<any>('/products');
          return res.items || [];
        },
        staleTime: STALE_TIME_MS,
      })
    );
  } else if (role === 'buyer') {
    prefetchPromises.push(
      queryClient.prefetchQuery({
        queryKey: ['buyer-requests', user.id],
        queryFn: async () => {
          const res = await api.get<any>('/buyers/requests');
          return res.items || [];
        },
        staleTime: STALE_TIME_MS,
      })
    );
  }

  await Promise.allSettled(prefetchPromises);
}
