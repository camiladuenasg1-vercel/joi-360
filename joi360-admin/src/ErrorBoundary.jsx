import React from "react";
import { reiniciarCacheLocal } from "./store";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error?.message || String(error) };
  }
  componentDidCatch(error, info) {
    console.error("JOI360 Admin Error:", error, info.componentStack);
  }
  reset() {
    reiniciarCacheLocal();
    // Hard reload so React remounts cleanly with fresh state
    window.location.href = window.location.pathname + "#/admin";
    window.location.reload();
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-surface">
          <div className="max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center">
                <span className="material-symbols-outlined text-error text-2xl">error</span>
              </div>
              <div>
                <h1 className="font-bold text-xl text-on-surface">Error inesperado</h1>
                <p className="text-sm text-on-surface-variant">El componente no pudo renderizar</p>
              </div>
            </div>
            <div className="bg-error-container/30 border border-error/20 rounded-xl p-4 mb-6">
              <p className="font-mono text-xs text-error break-words">{this.state.error}</p>
            </div>
            <p className="text-sm text-on-surface-variant mb-4">
              Esto suele ocurrir cuando el estado guardado en el navegador es incompatible con la versión actual.
              Restablecer la caché local recarga todo en vivo desde Supabase.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => this.reset()}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors">
                Restablecer caché local
              </button>
              <button
                onClick={() => { this.setState({ error: null }); window.history.back(); }}
                className="flex-1 py-3 rounded-xl border border-outline text-on-surface font-semibold text-sm hover:bg-surface-container transition-colors">
                Volver atrás
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
