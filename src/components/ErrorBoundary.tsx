"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-4">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm font-semibold text-slate-600">Něco se pokazilo</p>
          <p className="text-xs text-slate-400 max-w-xs">Zkuste obnovit stránku. Pokud problém přetrvává, kontaktujte podporu.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: "#2E6DA4" }}
          >
            Obnovit stránku
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
