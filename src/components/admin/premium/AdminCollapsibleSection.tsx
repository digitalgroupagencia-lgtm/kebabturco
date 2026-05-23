import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export default function AdminCollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: Props) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={className}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-2xl border bg-card px-3.5 py-3 text-left hover:bg-muted/30 transition-colors group">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          {summary && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{summary}</p>}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 px-0.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}
