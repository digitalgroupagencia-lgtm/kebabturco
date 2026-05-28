import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Loader2, UserCheck } from "lucide-react";
import {
  fetchStorePayoutIntake,
  formatIbanDisplay,
  type StorePayoutIntake,
} from "@/services/payoutIntakeService";

type Props = {
  storeId: string;
};

export default function AdminPayoutIntakeCard({ storeId }: Props) {
  const [row, setRow] = useState<StorePayoutIntake | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setMissingTable(false);
      try {
        const data = await fetchStorePayoutIntake(storeId);
        if (active) setRow(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("store_payout_intake") || msg.includes("does not exist")) {
          setMissingTable(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [storeId]);

  const copyAll = async () => {
    if (!row) return;
    const text = [
      `Negócio: ${row.business_name}`,
      `Titular: ${row.owner_full_name}`,
      `IBAN: ${row.iban}`,
      row.tax_id ? `NIF/CIF: ${row.tax_id}` : null,
      row.owner_email ? `Email: ${row.owner_email}` : null,
      row.owner_phone ? `Telefone: ${row.owner_phone}` : null,
      row.business_address ? `Morada: ${row.business_address}` : null,
      row.notes ? `Notas: ${row.notes}` : null,
      `Enviado: ${new Date(row.updated_at).toLocaleString("pt-PT")}`,
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Dados copiados — cole na Stripe");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> A carregar dados do restaurante…
        </CardContent>
      </Card>
    );
  }

  if (missingTable) {
    return (
      <Card className="border-amber-500/40">
        <CardContent className="py-4 text-sm text-amber-800 dark:text-amber-200">
          Execute o SQL «Dados bancários» na base de dados para ver o formulário enviado pelo restaurante.
        </CardContent>
      </Card>
    );
  }

  if (!row) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-sm text-muted-foreground text-center">
          O dono do restaurante ainda não enviou os dados bancários pelo painel.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Dados enviados pelo restaurante (registar na Stripe)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><strong>Negócio:</strong> {row.business_name}</p>
        <p><strong>Titular:</strong> {row.owner_full_name}</p>
        <p><strong>IBAN:</strong> <span className="font-mono">{formatIbanDisplay(row.iban)}</span></p>
        {row.tax_id && <p><strong>NIF/CIF:</strong> {row.tax_id}</p>}
        {row.owner_email && <p><strong>Email:</strong> {row.owner_email}</p>}
        {row.owner_phone && <p><strong>Telefone:</strong> {row.owner_phone}</p>}
        {row.business_address && <p><strong>Morada:</strong> {row.business_address}</p>}
        {row.notes && <p><strong>Notas:</strong> {row.notes}</p>}
        <p className="text-xs text-muted-foreground pt-1">
          Actualizado em {new Date(row.updated_at).toLocaleString("pt-PT")}
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void copyAll()}>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copiar tudo para a Stripe
        </Button>
      </CardContent>
    </Card>
  );
}
