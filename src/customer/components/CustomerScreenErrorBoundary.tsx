import React, { type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Identificador para logs (home, menu, product, payment, …). */
  scope: string;
  title?: string;
  description?: string;
  onRecover?: () => void;
};

type State = { error: Error | null };

const DEFAULT_COPY: Record<string, { title: string; description: string }> = {
  bootstrap: {
    title: "Não foi possível iniciar o pedido",
    description: "Tente actualizar a página. O cardápio e o pagamento continuam disponíveis depois de recarregar.",
  },
  home: {
    title: "Não foi possível carregar o menu",
    description: "O resto da app continua disponível. Tente de novo ou actualize a página.",
  },
  product: {
    title: "Não foi possível abrir este produto",
    description: "Volte ao cardápio e escolha outro item.",
  },
  checkout: {
    title: "Não foi possível abrir o checkout",
    description: "O seu carrinho foi guardado. Tente de novo ou volte ao menu.",
  },
};

/** Erro isolado por ecrã do cliente, não derruba a app inteira. */
export default class CustomerScreenErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[CustomerScreenErrorBoundary:${this.props.scope}]`, error.message, error.stack, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.children !== this.props.children && this.state.error) {
      this.setState({ error: null });
    }
  }

  private handleRecover = () => {
    if (this.props.onRecover) {
      this.props.onRecover();
      return;
    }
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      const copy = DEFAULT_COPY[this.props.scope] ?? {
        title: this.props.title ?? "Algo correu mal neste ecrã",
        description: this.props.description ?? "Tente actualizar a página.",
      };

      return (
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <p className="text-lg font-bold text-foreground">{this.props.title ?? copy.title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{this.props.description ?? copy.description}</p>
          <button
            type="button"
            onClick={this.handleRecover}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Tentar de novo
          </button>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        {this.props.children}
      </div>
    );
  }
}
