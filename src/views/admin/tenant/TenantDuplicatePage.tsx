import { useSelectedTenant } from "@/contexts/SelectedTenantContext";
import DuplicateTenantDialog from "@/components/admin/DuplicateTenantDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";

export default function TenantDuplicatePage() {
  const { tenant, loading } = useSelectedTenant();
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!tenant) return <p>Cliente não encontrado.</p>;
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <Copy className="w-6 h-6" /> Duplicar projeto "{tenant.name}"
      </h2>
      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Cria um novo cliente com a mesma estrutura: identidade visual, fluxo do totem, configurações de pagamento e categorias.
            Você pode escolher se quer copiar produtos, imagens e banners.
          </p>
          <DuplicateTenantDialog
            sourceTenantId={tenant.id}
            sourceName={tenant.name}
            trigger={<Button size="lg" className="w-full sm:w-auto"><Copy className="w-4 h-4 mr-2" /> Abrir duplicador</Button>}
          />
        </CardContent>
      </Card>
    </div>
  );
}