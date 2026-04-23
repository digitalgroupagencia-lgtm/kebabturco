import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

const SellerNewOrder = () => {
  const navigate = useNavigate();
  return (
    <div className="p-4 space-y-3">
      <button onClick={() => navigate(-1)} className="text-sm flex items-center gap-1 text-muted-foreground"><ArrowLeft className="w-4 h-4" /> Voltar</button>
      <h1 className="text-xl font-black">Novo pedido</h1>
      <Card>
        <CardContent className="p-5 space-y-3 text-center">
          <Construction className="w-10 h-10 mx-auto text-cta" />
          <p className="font-bold">Fluxo de novo pedido em construção</p>
          <p className="text-xs text-muted-foreground">
            Próxima entrega: selecionar mesa, digitar nome do cliente, abrir o cardápio e enviar pedido para a cozinha vinculado a você.
          </p>
          <Button onClick={() => navigate("/seller")}>Voltar para o início</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerNewOrder;
