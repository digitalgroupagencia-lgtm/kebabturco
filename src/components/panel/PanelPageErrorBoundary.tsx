import React, { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStaffT } from "@/hooks/useStaffT";

type Props = { children: ReactNode };

type State = { error: Error | null };

function PanelPageErrorFallback({
  onRetry,
}: {
  onRetry: () => void;
}) {
  const { t } = useStaffT();

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <p className="text-lg font-bold">{t("error.page_load")}</p>
      <p className="max-w-md text-sm text-muted-foreground">{t("error.page_body")}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={onRetry}>
          {t("dashboard.retry")}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          {t("error.reload")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Erro isolado na área de conteúdo do painel, mantém menu e cabeçalho visíveis.
 */
class PanelPageErrorBoundaryInner extends React.Component<Props & { resetKey: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prevProps: Props & { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[PanelPageErrorBoundary]", error.message, error.stack, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <PanelPageErrorFallback onRetry={() => this.setState({ error: null })} />;
    }

    return this.props.children;
  }
}

export default function PanelPageErrorBoundary({ children }: Props) {
  const { pathname } = useLocation();
  return (
    <PanelPageErrorBoundaryInner resetKey={pathname}>{children}</PanelPageErrorBoundaryInner>
  );
}
