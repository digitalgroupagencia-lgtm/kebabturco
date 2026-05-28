import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  icon?: ReactNode;
  alerts?: ReactNode;
  storeSwitcher?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  statusCards?: ReactNode;
  testSection?: ReactNode;
  logsPanel?: ReactNode;
  footerLink?: ReactNode;
  children?: ReactNode;
};

export default function AdminDiagnosticShell({
  title,
  description,
  icon,
  alerts,
  storeSwitcher,
  refreshing,
  onRefresh,
  statusCards,
  testSection,
  logsPanel,
  footerLink,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      {alerts}
      {storeSwitcher}

      {onRefresh ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualizar estado
          </Button>
        </div>
      ) : null}

      {statusCards}
      {children}
      {testSection}
      {logsPanel}
      {footerLink}
    </div>
  );
}
