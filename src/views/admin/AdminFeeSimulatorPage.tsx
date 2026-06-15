import { useMemo, useState } from "react";
import AdminPageHeader from "@/components/admin/premium/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { APP_NAME } from "@/lib/appMode";

// Mesmos valores usados no backend (supabase/functions/_shared/stripeFees.ts)
const STRIPE_PCT = 0.015; // 1,5% por pagamento (cartão UE)
const STRIPE_FIXED = 0.25; // €0,25 por pagamento
const PLATFORM_FEE = 1; // o seu €1 por pedido (lucro alvo)
const CONNECT_MONTHLY = 2; // €2 por restaurante ativo / mês (conta Connect)
const CONNECT_PAYOUT_FIXED = 0.1; // €0,10 por payout bancário (semanal/diário)

function euro(n: number): string {
  return `€${(Number.isFinite(n) ? n : 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(n: number): string {
  return `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;
}

function num(value: string, min = 0): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? Math.max(min, n) : min;
}

export default function AdminFeeSimulatorPage() {
  const [revenue, setRevenue] = useState("6000");
  const [avgOrder, setAvgOrder] = useState("16");
  const [freq, setFreq] = useState("weekly");
  const [glovoPct, setGlovoPct] = useState("30");
  const [uberPct, setUberPct] = useState("30");
  const [justEatPct, setJustEatPct] = useState("20");

  const calc = useMemo(() => {
    const rev = num(revenue);
    const avg = Math.max(0.01, num(avgOrder));
    const payoutsPerMonth = freq === "daily" ? 30 : freq === "weekly" ? 4 : 1;
    const orders = Math.round(rev / avg);

    const stripeFee = rev * STRIPE_PCT + STRIPE_FIXED * orders;
    const platformFeePerOrder = avg < 10 ? 0.5 : 1;
    const commission = platformFeePerOrder * orders;
    const restaurantBefore = rev - commission - stripeFee;
    const connectFixed = CONNECT_PAYOUT_FIXED * payoutsPerMonth;
    const connectTotal = CONNECT_MONTHLY + connectFixed;

    const ourCost = commission + stripeFee + connectTotal;
    const ourEffPct = rev > 0 ? (ourCost / rev) * 100 : 0;
    const ourKeeps = rev - ourCost;

    const gP = num(glovoPct);
    const uP = num(uberPct);
    const jP = num(justEatPct);
    const glovoCost = rev * (gP / 100);
    const uberCost = rev * (uP / 100);
    const justEatCost = rev * (jP / 100);

    return {
      rev,
      avg,
      orders,
      platformFeePerOrder,
      stripeFee,
      commission,
      connectTotal,
      ourCost,
      ourEffPct,
      ourKeeps,
      gP,
      uP,
      jP,
      glovoCost,
      uberCost,
      justEatCost,
      saveVsGlovo: glovoCost - ourCost,
      saveVsUber: uberCost - ourCost,
    };
  }, [revenue, avgOrder, freq, glovoPct, uberPct, justEatPct]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <AdminPageHeader
        title="Simulador de taxas"
        description={`Compare o que o restaurante perde no ${APP_NAME} com a Glovo, Uber Eats e Just Eat. Ideal para mostrar ao restaurante quanto poupa.`}
        breadcrumbs={[{ label: "Administração", to: "/admin" }, { label: "Simulador de taxas" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do restaurante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="revenue">Faturamento mensal (€)</Label>
              <Input id="revenue" type="number" inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avgOrder">Valor médio do pedido (€)</Label>
              <Input id="avgOrder" type="number" inputMode="decimal" value={avgOrder} onChange={(e) => setAvgOrder(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pagamento ao restaurante</Label>
              <Select value={freq} onValueChange={setFreq}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário (30/mês)</SelectItem>
                  <SelectItem value="weekly">Semanal (4/mês)</SelectItem>
                  <SelectItem value="monthly">Mensal (1/mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="glovo">Comissão Glovo (%)</Label>
              <Input id="glovo" type="number" inputMode="decimal" value={glovoPct} onChange={(e) => setGlovoPct(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uber">Comissão Uber Eats (%)</Label>
              <Input id="uber" type="number" inputMode="decimal" value={uberPct} onChange={(e) => setUberPct(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="justeat">Comissão Just Eat (%)</Label>
              <Input id="justeat" type="number" inputMode="decimal" value={justEatPct} onChange={(e) => setJustEatPct(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{euro(calc.saveVsGlovo)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Poupança vs Glovo / mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{euro(calc.saveVsGlovo * 12)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Poupança vs Glovo / ano</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-black text-foreground">{euro(calc.commission)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Seu lucro / mês (€{calc.platformFeePerOrder.toFixed(2).replace(".", ",")} × {calc.orders} pedidos)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plataforma</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Fica para a plataforma</TableHead>
                <TableHead className="text-right">Restaurante recebe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-primary/5 font-semibold">
                <TableCell>{APP_NAME} (você)</TableCell>
                <TableCell className="text-right">{pct(calc.ourEffPct)}</TableCell>
                <TableCell className="text-right">{euro(calc.ourCost)}</TableCell>
                <TableCell className="text-right text-emerald-600 dark:text-emerald-500">{euro(calc.ourKeeps)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Glovo</TableCell>
                <TableCell className="text-right">{pct(calc.gP)}</TableCell>
                <TableCell className="text-right text-destructive">{euro(calc.glovoCost)}</TableCell>
                <TableCell className="text-right">{euro(calc.rev - calc.glovoCost)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Uber Eats</TableCell>
                <TableCell className="text-right">{pct(calc.uP)}</TableCell>
                <TableCell className="text-right text-destructive">{euro(calc.uberCost)}</TableCell>
                <TableCell className="text-right">{euro(calc.rev - calc.uberCost)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Just Eat</TableCell>
                <TableCell className="text-right">{pct(calc.jP)}</TableCell>
                <TableCell className="text-right">{euro(calc.justEatCost)}</TableCell>
                <TableCell className="text-right">{euro(calc.rev - calc.justEatCost)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como se compõe a sua taxa (por mês)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-lg font-bold">{calc.orders}</p>
              <p className="text-xs text-muted-foreground">Pedidos no mês</p>
            </div>
            <div>
              <p className="text-lg font-bold">{euro(calc.commission)}</p>
              <p className="text-xs text-muted-foreground">
                Sua comissão (€{calc.platformFeePerOrder.toFixed(2).replace(".", ",")}/pedido)
              </p>
            </div>
            <div>
              <p className="text-lg font-bold">{euro(calc.stripeFee)}</p>
              <p className="text-xs text-muted-foreground">Taxa do pagamento</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-500">{euro(calc.connectTotal)}</p>
              <p className="text-xs text-muted-foreground">Custos da rede</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            A Glovo e a Uber cobram uma percentagem do faturamento (cerca de 30%). O seu modelo
            cobra €0,50 em pedidos abaixo de €10 e €1 a partir de €10 — por isso em pedidos maiores a sua percentagem real
            cai, enquanto a das outras se mantém alta. Nota: a Glovo e a Uber incluem estafetas e
            publicidade próprios; a comparação acima é sobre a comissão que retêm das vendas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
