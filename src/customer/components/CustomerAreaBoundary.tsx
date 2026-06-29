import React, { type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Barreira final do cliente.
 * Qualquer crash em provider, hook ou módulo importado pela área pública
 * (cardápio, carrinho, checkout) é apanhado aqui e mostra um fallback
 * minimalista — em vez de tela branca que mata as vendas.
 *
 * Deve envolver TUDO o que está dentro do "/" cliente, INCLUSIVE providers
 * partilhados com áreas internas. Isolamento defensivo: erro interno nunca
 * derruba o cardápio.
 */
export default class CustomerAreaBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[CustomerAreaBoundary]", error.message, error.stack, info.componentStack);
    try {
      // Marca no localStorage para podermos auditar depois
      window.localStorage.setItem(
        "customer_area_last_crash",
        JSON.stringify({
          at: new Date().toISOString(),
          message: error.message,
          stack: error.stack?.slice(0, 2000) ?? null,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      /* noop */
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-lg font-bold text-foreground">Não foi possível abrir o cardápio</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Houve um problema temporário a carregar a página. Tente actualizar.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Actualizar página
        </button>
      </div>
    );
  }
}
