import { CheckCircle2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CatalogAuditIssue } from "@/lib/modifiers/menuCatalogAudit";

type Props = {
  items: CatalogAuditIssue[];
  loading?: boolean;
  onOpen: (issue: CatalogAuditIssue) => void;
  onApprove: (issue: CatalogAuditIssue) => void;
  approvingId?: string | null;
};

export default function MenuProductReviewQueue({
  items,
  loading,
  onOpen,
  onApprove,
  approvingId,
}: Props) {
  if (loading) {
    return (
      <Card className="border-amber-500/30 mb-6">
        <CardContent className="py-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          A preparar produtos para revisão…
        </CardContent>
      </Card>
    );
  }

  if (!items.length) return null;

  return (
    <Card className="border-amber-500/40 bg-amber-500/5 mb-6 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Pencil className="h-5 w-5 text-amber-700" />
          Produtos a rever ({items.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Abra cada produto, mude o que precisar (foto, nome, preço) e carregue em Aprovar quando estiver pronto.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((issue) => {
            const label = issue.matchedProductName || issue.optionName;
            const productId = issue.matchedProductId!;
            const busy = approvingId === productId;

            return (
              <div
                key={`${productId}-${issue.problem}`}
                className="rounded-xl border border-amber-500/30 bg-card p-3 flex flex-col gap-3"
              >
                <div>
                  <p className="font-bold text-sm leading-snug">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{issue.problem}</p>
                </div>
                <div className="flex gap-2 mt-auto">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="flex-1 h-9"
                    onClick={() => onOpen(issue)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Rever
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 h-9"
                    disabled={busy}
                    onClick={() => onApprove(issue)}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Aprovar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
