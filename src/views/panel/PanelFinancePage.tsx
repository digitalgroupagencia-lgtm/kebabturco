import { Wallet, Phone } from "lucide-react";
import PanelStoreSwitcher from "@/components/panel/PanelStoreSwitcher";
import { Card, CardContent } from "@/components/ui/card";

const PanelFinancePage = () => {
  return (
    <div className="mx-auto max-w-lg space-y-5 pb-10">
      <PanelStoreSwitcher />

      <div>
        <h1 className="text-xl font-black flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Recebimentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Os recebimentos dos pedidos online são geridos pela equipa Kebab Turco.
        </p>
      </div>

      <Card>
        <CardContent className="py-6 space-y-3 text-sm leading-relaxed">
          <p>
            Não precisa de configurar nada aqui. A nossa equipa regista a conta bancária e activa os pagamentos por
            si.
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            Se precisar de alterar dados bancários, contacte o suporte Kebab Turco.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PanelFinancePage;
