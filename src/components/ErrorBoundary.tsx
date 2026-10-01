import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { get as getIDB, set as setIDB } from 'idb-keyval';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  inline?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
    try {
      getIDB<any[]>('nexus_system_crashes').then((existing = []) => {
        const updated = [
          {
            timestamp: new Date().toISOString(),
            message: error?.message || String(error),
            stack: error?.stack,
            componentStack: errorInfo?.componentStack
          },
          ...(existing || [])
        ].slice(0, 20);
        setIDB('nexus_system_crashes', updated).catch(() => {});
      }).catch(() => {});
    } catch (_) {}
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.inline) {
        return (
          <div className="p-6 bg-slate-900 border border-rose-500/30 rounded-xl text-center space-y-4 m-4">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto border border-rose-500/20 text-rose-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Une erreur est survenue dans cette boîte de dialogue.</p>
              <p className="text-xs text-slate-400 mt-1">{this.state.error?.message || 'Erreur inconnue'}</p>
            </div>
            <div className="flex justify-center gap-2">
              <Button size="sm" onClick={this.handleReset} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
                Fermer / Réinitialiser
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-white/5 rounded-xl p-5 shadow-md space-y-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="text-rose-500" size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white  uppercase tracking-tight">System Crash Intercepted</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Une erreur d'affichage temporaire est survenue.</p>
            </div>

            <Button 
              size="lg"
              onClick={this.handleReload}
              className="w-full h-14 bg-white text-black hover:bg-slate-200 rounded-xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl"
            >
              <RefreshCcw size={20} />
              Rafraîchir la page
            </Button>

            <div className="pt-4 border-t border-white/5">
              <button 
                onClick={this.toggleDetails}
                className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-slate-300 transition-colors mx-auto uppercase tracking-widest"
              >
                {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {this.state.showDetails ? "Masquer les détails" : "Détails techniques"}
              </button>

              {this.state.showDetails && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 p-4 bg-black/40 rounded-xl text-left overflow-hidden"
                >
                  <p className="text-[10px] font-mono text-rose-400/80 break-all">
                    {this.state.error && this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-[8px] font-mono text-slate-600 mt-2 whitespace-pre-wrap leading-tight max-h-40 overflow-y-auto custom-scrollbar">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </motion.div>
              )}
            </div>

            <p className="text-[8px] font-black text-white/5 uppercase tracking-normal">Nexus POS Pro v1.2.19 Safety Layer</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ModalErrorBoundary({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <ErrorBoundary inline onReset={onClose}>
      {children}
    </ErrorBoundary>
  );
}
