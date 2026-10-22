import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('UI Crash:', { error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-6 text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-black text-red-500">Waan raaligelinaynaa!</h1>
            <p className="text-white/70">Cilad ayaa ka dhacday shaashadda. Fadlan isku day inaad dib u rarto (refresh) bogga.</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button 
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }} 
                className="px-5 py-2.5 bg-emerald-500 rounded-xl font-bold text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
              >
                Dib u bilaaw (Refresh)
              </button>
              <button 
                onClick={() => {
                  try {
                    localStorage.removeItem('tuko_guest_days');
                    sessionStorage.clear();
                  } catch {}
                  this.setState({ hasError: false });
                  window.location.reload();
                }} 
                className="px-5 py-2.5 bg-white/10 border border-white/20 rounded-xl font-bold text-white hover:bg-white/20 transition cursor-pointer"
              >
                Xali &amp; Dib u bilow
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
