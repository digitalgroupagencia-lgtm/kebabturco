import React, { type ReactNode } from "react";

type Props = {
  children: ReactNode;
  onBack: () => void;
  productLabel?: string;
  /** Se a personalização avançada falhar, mostra isto em vez de bloquear o produto. */
  fallback?: ReactNode;
};

type State = { error: Error | null };

/** Erro isolado na tela do produto, não derruba o cardápio. */
export default class ProductErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ProductErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return <div className="flex h-full min-h-0 flex-col">{this.props.fallback}</div>;
      }

      return (
        <div className="flex h-full min-h-0 flex-col bg-background">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-lg font-bold text-foreground">Não foi possível abrir este produto</p>
            {this.props.productLabel && (
              <p className="text-sm font-semibold text-muted-foreground">{this.props.productLabel}</p>
            )}
            <p className="max-w-xs text-sm text-muted-foreground">
              Pode voltar ao cardápio e escolher outro item. Se o problema continuar, actualize a página.
            </p>
            <button
              type="button"
              onClick={this.props.onBack}
              className="h-12 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground"
            >
              Voltar ao cardápio
            </button>
          </div>
        </div>
      );
    }

    return <div className="flex h-full min-h-0 flex-col">{this.props.children}</div>;
  }
}
