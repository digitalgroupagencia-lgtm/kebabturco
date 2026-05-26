import React, { type ReactNode } from "react";

type Props = { children: ReactNode; area?: string };

type State = { error: Error | null };

/** Erro isolado no painel/admin — não afecta a loja pública. */
export default class AdminErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[AdminErrorBoundary:${this.props.area ?? "internal"}]`, error.message, error.stack, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-bold">Erro no painel</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Esta secção falhou ao carregar. A loja pública do cliente não foi afectada.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
