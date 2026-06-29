import React, { type ReactNode } from "react";
import { dismissBootShell } from "@/lib/bootShell";

type Props = { children: ReactNode };

type State = { error: Error | null };

export default class TotemErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[TotemErrorBoundary]", error.name, error.message, error.stack, info.componentStack);
    dismissBootShell();
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-background px-6 text-center"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <p className="text-lg font-bold text-foreground">Ocorreu um erro inesperado</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Tente actualizar a página. Se continuar, limpe o cache do Safari (Definições → Safari → Limpar histórico).
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Actualizar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
