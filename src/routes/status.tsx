import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Activity, Wifi, Loader2, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';
import { PhoneFrame } from '@/components/AppShell';
import { api } from '../lib/api-client';

export const Route = createFileRoute('/status')({
  head: () => ({
    meta: [
      { title: 'System Status — Artisera' },
      { name: 'description', content: 'Artisera API and service diagnostics connection dashboard.' }
    ]
  }),
  component: SystemStatus,
});

interface DiagnosticCheck {
  status: 'ok' | 'warn' | 'error';
  message: string;
}

interface BackendDiagnostics {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  checks?: {
    database?: DiagnosticCheck;
    gemini?: DiagnosticCheck;
    sarvam?: DiagnosticCheck;
  };
}

function SystemStatus() {
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'error'>('offline');
  const [diagnostics, setDiagnostics] = useState<BackendDiagnostics | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Call the root backend API diagnostics route
      const res = await api.get<any>('/');
      if (res && (res.service || res.status)) {
        setBackendStatus('online');
        // Parse health / check results
        setDiagnostics(res);
      } else {
        setBackendStatus('error');
        setErrorMsg('Invalid response structure received from API.');
      }
    } catch (err: any) {
      setBackendStatus('offline');
      setErrorMsg(err.message || 'Failed to establish connection to the backend server.');
      setDiagnostics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <PhoneFrame>
      <div className="space-y-6 px-4 pb-8 pt-4">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary hover:bg-secondary/80"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-extrabold tracking-tight">System Status</h1>
            <p className="text-xs text-muted-foreground">Diagnostics and active API connections</p>
          </div>
        </div>

        {/* Live Status Summary Card */}
        <section className="ai-surface app-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-sm">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              Overall Health
            </span>
            {loading ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking
              </span>
            ) : backendStatus === 'online' && (!diagnostics?.status || diagnostics.status === 'OK') ? (
              <span className="badge bg-success/10 text-success text-xs font-bold px-3 py-1 rounded-full border border-success/20">
                HEALTHY
              </span>
            ) : backendStatus === 'online' ? (
              <span className="badge bg-warning/10 text-warning text-xs font-bold px-3 py-1 rounded-full border border-warning/20">
                DEGRADED
              </span>
            ) : (
              <span className="badge bg-destructive/10 text-destructive text-xs font-bold px-3 py-1 rounded-full border border-destructive/20">
                OFFLINE
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            This panel verifies integrations from this frontend client to the hosted serverless backend modules on Vercel.
          </p>

          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="btn-cta w-full py-2.5 text-center flex justify-center text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </section>

        {/* Connection Services Checklists */}
        <section className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground pl-1">
            Active Integrations
          </h2>

          <div className="space-y-2.5">
            
            {/* 1. Frontend Client Status */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold">Artisera Frontend Client</p>
                <p className="text-xs text-muted-foreground">Running locally in browser</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-success">
                <CheckCircle className="h-4.5 w-4.5 fill-success/15" /> Online
              </span>
            </div>

            {/* 2. Backend API Status */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold">Vercel API Express Server</p>
                <p className="text-xs text-muted-foreground">Host: Vercel Serverless Function</p>
              </div>
              {loading ? (
                <span className="text-xs text-muted-foreground">Checking...</span>
              ) : backendStatus === 'online' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-success">
                  <CheckCircle className="h-4.5 w-4.5 fill-success/15" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-destructive">
                  <XCircle className="h-4.5 w-4.5 fill-destructive/15" /> Disconnected
                </span>
              )}
            </div>

            {/* 3. Database Check */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold">Supabase Database Connection</p>
                <p className="text-xs text-muted-foreground">Tables: artisans, products, wishlists</p>
              </div>
              {loading ? (
                <span className="text-xs text-muted-foreground">Checking...</span>
              ) : backendStatus !== 'online' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                  Unknown
                </span>
              ) : !diagnostics?.checks?.database || diagnostics.checks.database.status === 'ok' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-success">
                  <CheckCircle className="h-4.5 w-4.5 fill-success/15" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-destructive">
                  <XCircle className="h-4.5 w-4.5 fill-destructive/15" /> Failed
                </span>
              )}
            </div>

            {/* 4. Gemini AI Check */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold">Google Gemini Client</p>
                <p className="text-xs text-muted-foreground">Model: gemini-1.5-flash</p>
              </div>
              {loading ? (
                <span className="text-xs text-muted-foreground">Checking...</span>
              ) : backendStatus !== 'online' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                  Unknown
                </span>
              ) : !diagnostics?.checks?.gemini || diagnostics.checks.gemini.status === 'ok' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-success">
                  <CheckCircle className="h-4.5 w-4.5 fill-success/15" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-warning animate-pulse">
                  <AlertTriangle className="h-4.5 w-4.5" /> Missing Key
                </span>
              )}
            </div>

            {/* 5. Sarvam Translation / Speech check */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold">Sarvam AI (Speech & Audio)</p>
                <p className="text-xs text-muted-foreground">Transcription & translations</p>
              </div>
              {loading ? (
                <span className="text-xs text-muted-foreground">Checking...</span>
              ) : backendStatus !== 'online' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                  Unknown
                </span>
              ) : !diagnostics?.checks?.sarvam || diagnostics.checks.sarvam.status === 'ok' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-success">
                  <CheckCircle className="h-4.5 w-4.5 fill-success/15" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-warning">
                  <AlertTriangle className="h-4.5 w-4.5" /> Missing Key
                </span>
              )}
            </div>

          </div>
        </section>

        {/* Error Console Report if offline */}
        {backendStatus !== 'online' && !loading && errorMsg && (
          <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
              <ShieldAlert className="h-4 w-4" /> Connection Failure Trace
            </div>
            <p className="text-[11px] font-mono text-destructive/80 leading-relaxed break-all bg-black/10 p-2.5 rounded-lg border border-destructive/10">
              {errorMsg}
            </p>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Make sure your Vercel backend deployment succeeded and that its URL matches your API configuration endpoints.
            </p>
          </section>
        )}
        
      </div>
    </PhoneFrame>
  );
}
