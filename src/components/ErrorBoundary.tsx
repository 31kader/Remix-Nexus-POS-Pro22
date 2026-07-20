import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
  }

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle className="text-rose-500" size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">System Crash Intercepted</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Une erreur d'affichage temporaire est survenue.</p>
            </div>

            <Button 
              size="lg"
              onClick={this.handleReload}
              className="w-full h-14 bg-white text-black hover:bg-slate-200 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl"
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

            <p className="text-[8px] font-black text-white/5 uppercase tracking-[0.3em]">Nexus POS Alpha v1.2.6 Safety Layer</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
