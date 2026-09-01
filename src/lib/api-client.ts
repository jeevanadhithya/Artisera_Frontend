import { supabase } from './supabase';

const getApiBaseUrl = () => {
  // If explicitly configured via environment variable, always prioritize it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Client-side local development check
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
    return 'https://artisera-backend.vercel.app/api';
  }
  
  // SSR/Server-side detection
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api';
  }
  return 'https://artisera-backend.vercel.app/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Global fetch wrapper with automatic auth header injection
const request = async <T>(
  method: string,
  endpoint: string,
  body?: any,
  isMultipart: boolean = false
): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = isMultipart ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (response.status === 204) {
      return {} as T;
    }

    const rawText = await response.text();
    let payload: any = {};
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch (_) {
      throw new Error(`Server returned error (${response.status}): ${rawText.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(payload.error?.message || `HTTP error! Status: ${response.status}`);
    }

    return payload.success ? payload.data : payload;
  } catch (error) {
    console.error(`API Request failed [${method} ${endpoint}]:`, error);
    throw error;
  }
};

export const api = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  post: <T>(endpoint: string, body?: any) => request<T>('POST', endpoint, body),
  put: <T>(endpoint: string, body?: any) => request<T>('PUT', endpoint, body),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
  
  // Image Pipeline API Methods
  uploadProductImage: <T = any>(productId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<T>('POST', `/products/${productId}/images`, formData, true);
  },

  enhanceProductImage: <T = any>(productId: string, imageId: string) => {
    return request<T>('POST', `/products/${productId}/images/${imageId}/enhance`);
  },

  enhanceImageDirect: <T = any>(imageId: string) => {
    return request<T>('POST', `/images/${imageId}/enhance`);
  },

  selectProductImage: <T = any>(productId: string, imageId: string, selection: 'enhanced' | 'original') => {
    return request<T>('POST', `/products/${productId}/images/${imageId}/select`, { selection });
  },

  getProductImages: <T = any[]>(productId: string) => {
    return request<T>('GET', `/products/${productId}/images`);
  },

  // Legacy fallback
  uploadImage: <T = any>(productId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<T>('POST', `/products/${productId}/images`, formData, true);
  },
  
  enhanceImage: <T = any>(productId: string, file?: File) => {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    return request<T>('POST', `/products/${productId}/enhance-image`, formData, true);
  },
  
  uploadVoice: <T = any>(productId: string, file: File, language?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (language) {
      formData.append('language', language);
    }
    return request<T>('POST', `/products/${productId}/voice`, formData, true);
  },

  // Multilingual Translations
  translateProduct: <T = any>(productId: string) => {
    return request<T>('POST', `/products/${productId}/translate`);
  },

  getProductTranslations: <T = any[]>(productId: string) => {
    return request<T>('GET', `/products/${productId}/translations`);
  },

  // Marketplace Export
  exportMarketplace: <T = any>(productId: string, marketplace: 'amazon' | 'flipkart' | 'gem') => {
    return request<T>('GET', `/products/${productId}/export/${marketplace}`);
  },
};

