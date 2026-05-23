import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  backTo?: string;
  children: React.ReactNode;
};

export default function CentralPageShell({ title, description, backTo = "/admin/centrals", children }: Props) {
  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" asChild>
          <Link to={backTo}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
