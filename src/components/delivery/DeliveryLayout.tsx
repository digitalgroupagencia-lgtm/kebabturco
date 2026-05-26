import type { ComponentType } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import DeliveryAccessGuard from "@/components/delivery/DeliveryAccessGuard";

type Props = {
  page?: ComponentType<object>;
};

export default function DeliveryLayout({ page: Page }: Props) {
  const { signOut } = useAuth();

  return (
    <DeliveryAccessGuard>
      <div className="min-h-dvh bg-background flex flex-col">
        <header className="sticky top-0 z-30 border-b bg-orange-600 text-white px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">Entregas</p>
            <h1 className="text-lg font-black">Painel do entregador</h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto p-3 pb-8 max-w-lg mx-auto w-full">
          {Page ? <Page /> : null}
        </main>
      </div>
    </DeliveryAccessGuard>
  );
}
