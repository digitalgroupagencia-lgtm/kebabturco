import React, { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; area?: string; resetKey?: string };

type State = { error: Error | null };

/** Erro isolado no painel/admin, não afecta a loja pública. */
export default class AdminErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[AdminErrorBoundary:${this.props.area ?? "internal"}]`,
      error.message,
      error.stack,
      info.componentStack,
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-bold">Erro no painel</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Esta secção falhou ao carregar. A loja pública do cliente não foi afectada.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={() => this.setState({ error: null })}>
              Tentar novamente
            </Button>
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
